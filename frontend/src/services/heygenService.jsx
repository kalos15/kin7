import { httpsCallable } from 'firebase/functions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { functions, db } from '../firebaseConfig'; 
import { 
    Room, 
    RoomEvent, 
    RemoteVideoTrack, 
    RemoteAudioTrack, 
    ConnectionQuality
} from 'livekit-client';

// ==============================================================================
// GLOBAL STATE MANAGERS
// We keep these outside the component to ensure the connection survives 
// React re-renders and allows for background cleanup.
// ==============================================================================
let room = null;
let currentSessionId = null;
let billingTimer = null;
let isVideoActive = false;
let billingRetryInterval = null;

// Helper to safely call status update UI callback
const safeStatus = (fn, msg) => { if (fn && typeof fn === 'function') fn(msg); };

/**
 * ENTERPRISE AVATAR CLIENT - REAL DATA EDITION
 * ------------------------------------------------------------------------------
 * 1. Authenticates user & checks balance via Cloud Function.
 * 2. Connects to LiveKit WEBRTC Room.
 * 3. Waits for "TrackSubscribed" (Video) to start the billing clock (Real Usage).
 * 4. Syncs "realStartTime" to Firestore for the Admin Dashboard.
 * ------------------------------------------------------------------------------
 */
export async function startAvatarSession(
    uid, 
    personaId, 
    videoRef, 
    audioRef, 
    onStatusChange, 
    onVideoStarted, 
    onSessionEnd,
    onTimerUpdate,
    onNetworkWarning // Callback: (isBadConnection) => void
) {
    if (!uid) throw new Error("User ID missing");
    
    // 1. UPDATE UI STATUS
    safeStatus(onStatusChange, "Authenticating...");

    try {
        // 2. FETCH TOKEN (Backend verifies Balance & Server Capacity)
        // This calls the 'api_session' function in main.py
        const sessionFn = httpsCallable(functions, 'api_session');
        
        let response;
        try {
            response = await sessionFn({ action: 'start', uid: uid, personaId: personaId });
        } catch (apiError) {
             console.error("API Error:", apiError);
             let msg = "Connection failed.";
             // Friendly error mapping
             if(apiError.message.includes("Insufficient")) msg = "Insufficient Balance. Please Top Up.";
             if(apiError.message.includes("Maintenance")) msg = "System under maintenance.";
             throw new Error(msg);
        }
        
        const data = response.data;
        if (!data || !data.session_id || !data.rtc) {
            throw new Error("Invalid session token received.");
        }

        currentSessionId = data.session_id;
        const { token, url } = data.rtc;

        safeStatus(onStatusChange, "Connecting to Secure Room...");

        // 3. CLEANUP ANY GHOST CONNECTIONS
        if (room) {
            await stopAvatarSession();
        }

        // 4. INITIALIZE LIVEKIT ROOM
        room = new Room({
            adaptiveStream: true,
            dynacast: true,
            publishDefaults: { simulcast: true },
            videoCaptureDefaults: { resolution: { width: 1280, height: 720 } }
        });

        // ==========================================================================
        // EVENT HANDLERS
        // ==========================================================================

        // A. TRACK SUBSCRIPTION (Video/Audio Arrives)
        // This is the most critical part for your "Real Data" requirement.
        room.on(RoomEvent.TrackSubscribed, async (track, publication, participant) => {
            
            // --- HANDLE VIDEO STREAM ---
            if (track.kind === 'video' && videoRef.current && track instanceof RemoteVideoTrack) {
                track.attach(videoRef.current);
                
                // REVENUE PROTECTION: Only start billing if we haven't already.
                if (!isVideoActive) {
                    isVideoActive = true;
                    safeStatus(onStatusChange, "Session Active");
                    
                    // Trigger UI callback
                    if (onVideoStarted) onVideoStarted();
                    
                    // --- REAL DATA: SYNC EXACT START TIME TO FIRESTORE ---
                    // We update the session doc to say "The video is now visible".
                    // This 'realStartTime' is what main.py uses for billing calculations.
                    if (currentSessionId) {
                        try {
                            const sessRef = doc(db, "sessions", currentSessionId);
                            await updateDoc(sessRef, {
                                status: "active",
                                realStartTime: serverTimestamp(), // <--- THE SOURCE OF TRUTH
                                isRendered: true
                            });
                        } catch (e) {
                            console.error("Firestore Sync Error (Start):", e);
                        }
                    }

                    // --- SIGNAL AGENT TO START TRACKING ---
                    // Sends a data packet to agent.py so it knows to start the billing logic.
                    sendBillingSignal("START_BILLING");
                    
                    // Start Local Timer for UX (Backend is authoritative, this is just visual)
                    startLocalTimer(onTimerUpdate);
                }
            }
            
            // --- HANDLE AUDIO STREAM ---
            if (track.kind === 'audio' && audioRef.current && track instanceof RemoteAudioTrack) {
                track.attach(audioRef.current);
                audioRef.current.play().catch(e => console.warn("Autoplay blocked:", e));
            }
        });

        // B. NETWORK QUALITY MONITOR (Reduces Support Tickets)
        room.on(RoomEvent.ConnectionQualityChanged, (quality) => {
            const isPoor = (quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost);
            if (onNetworkWarning) onNetworkWarning(isPoor);
        });

        // C. DISCONNECTION HANDLING
        room.on(RoomEvent.Disconnected, (reason) => {
            console.log(`[Client] Disconnected: ${reason}`);
            // Force cleanup logic
            stopAvatarSession().then(() => {
                if (onSessionEnd) onSessionEnd();
            });
        });

        // 5. CONNECT TO ROOM
        await room.connect(url, token);
        
        // 6. PUBLISH MICROPHONE
        try {
            await room.localParticipant.setMicrophoneEnabled(true);
        } catch (micErr) {
            console.warn("Mic access denied:", micErr);
            alert("Please allow microphone access to talk to the avatar.");
        }
        
        safeStatus(onStatusChange, "Waiting for Avatar Stream...");
        
        // 7. SAFETY NET: Window Close Event
        // Ensures we kill the session if the user closes the tab unexpectedly.
        window.addEventListener('beforeunload', handlePageUnload);

        return { sessionId: currentSessionId };

    } catch (err) {
        console.error("Connection Critical Fail:", err);
        stopAvatarSession();
        safeStatus(onStatusChange, "Connection Failed: " + err.message);
        throw err;
    }
}

/**
 * STOP SESSION (TEARDOWN)
 * Ensures billing stops immediately and Firestore status is updated.
 */
export async function stopAvatarSession() {
    // 1. Remove Safety Net
    window.removeEventListener('beforeunload', handlePageUnload);

    // 2. Stop Local Timer
    if (billingTimer) {
        clearInterval(billingTimer);
        billingTimer = null;
    }
    if (billingRetryInterval) {
        clearInterval(billingRetryInterval);
        billingRetryInterval = null;
    }

    // 3. Send Stop Signal to Agent (Revenue Protection)
    if (room && room.state === 'connected' && isVideoActive) {
        try {
            await sendBillingSignal("STOP_BILLING");
        } catch(e) { console.error("Billing stop signal failed", e); }
    }

    // 4. Disconnect Room
    if (room) {
        room.disconnect();
        room = null;
    }

    // 5. REAL DATA: UPDATE FIRESTORE TO 'COMPLETED'
    // This moves the session from "Live" to "History" in the dashboard
    if (currentSessionId) {
        try {
            const sessRef = doc(db, "sessions", currentSessionId);
            await updateDoc(sessRef, {
                status: "completed",
                endTime: serverTimestamp(),
                disconnectReason: "user_action"
            });
            console.log("Session marked completed in Firestore");
        } catch (e) { 
            console.error("Firestore Sync Error (End):", e);
        }
        currentSessionId = null;
    }

    isVideoActive = false;
}

/**
 * INTERNAL: HANDLE PAGE UNLOAD (ZOMBIE PREVENTION)
 * Called when user closes tab or refreshes.
 */
const handlePageUnload = () => {
    // 1. Signal Agent to stop billing
    if (room && room.state === 'connected') {
        const encoder = new TextEncoder();
        const data = JSON.stringify({ type: "STOP_BILLING" });
        try {
            room.localParticipant.publishData(encoder.encode(data), { reliable: true });
        } catch (e) {}
    }

    // 2. We don't await Firestore here because the browser might kill the process too fast.
    // 'agent.py' has a backup disconnection handler to catch this case.
};

/**
 * INTERNAL: RELIABLE SIGNALING
 * Sends data packets to the python agent via WebRTC data channel.
 */
async function sendBillingSignal(type) {
    if (!room || !room.localParticipant) return;
    
    const data = JSON.stringify({ type });
    const encoder = new TextEncoder();
    
    // Retry Logic for Critical Signals (Revenue Protection)
    let attempts = 0;
    const maxAttempts = 3;
    
    const trySend = async () => {
        try {
            await room.localParticipant.publishData(
                encoder.encode(data), 
                { reliable: true }
            );
            console.log(`[Signal Sent] ${type}`);
        } catch (e) {
            console.error(`Signal Failed (${attempts+1}/${maxAttempts}):`, e);
            attempts++;
            if(attempts < maxAttempts) {
                setTimeout(trySend, 500); 
            }
        }
    };
    trySend();
}

/**
 * INTERNAL: LOCAL TIMER (VISUAL ONLY)
 * Calculates time elapsed since video start for the UI.
 */
function startLocalTimer(callback) {
    if (billingTimer) clearInterval(billingTimer);
    const startTime = Date.now();
    
    // Initial call
    if (callback) callback("00:00", 0);

    billingTimer = setInterval(() => {
        if (!callback) return;
        const diff = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        callback(timeString, diff);
    }, 1000);
}

// ==============================================================================
// PUBLIC UTILITIES
// ==============================================================================

export function setSessionVolume(volume) {
    if (!room) return;
    room.remoteParticipants.forEach(p => {
        p.audioTracks.forEach(pub => {
            if (pub.track && pub.track.attachedElements) {
                pub.track.attachedElements.forEach(el => {
                    el.volume = volume;
                    el.muted = (volume <= 0);
                });
            }
        });
    });
}

export async function toggleMic(isEnabled) {
    if (!room || !room.localParticipant) return;
    await room.localParticipant.setMicrophoneEnabled(isEnabled);
}