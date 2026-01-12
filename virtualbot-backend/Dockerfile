# Use Python 3.11 Slim for speed and compatibility
FROM python:3.11-slim

# Enhance logging (Ensures logs show up in Cloud Run)
ENV PYTHONUNBUFFERED=1

# --- FIX: Install System Dependencies ---
# LiveKit and audio/video processing libraries require these low-level libs
# libx11-6: Required for graphics/windowing operations (even headless)
# libgl1: Required for video rendering logic
# libglib2.0-0: Common dependency for media processing
RUN apt-get update && apt-get install -y \
    libx11-6 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose the port (matches your gcloud command)
EXPOSE 8081

# Run the agent
# (Removed "start" argument as your python script does not require it)
CMD ["python", "agent.py", "start"]