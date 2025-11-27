# Use Python 3.11 slim image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    # Display port for headless browser (if needed by some tools, though we use headless flag)
    DISPLAY=:99

# Install system dependencies
# We need wget/curl to download geckodriver, and firefox-esr for the browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    gnupg \
    firefox-esr \
    libxtst6 \
    libgtk-3-0 \
    libdbus-glib-1-2 \
    libdbus-1-3 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install GeckoDriver
# We'll download a specific version known to work well, or use latest
RUN GECKODRIVER_VERSION=$(curl -s https://api.github.com/repos/mozilla/geckodriver/releases/latest | grep 'tag_name' | cut -d\" -f4) && \
    wget -q "https://github.com/mozilla/geckodriver/releases/download/$GECKODRIVER_VERSION/geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz" && \
    tar -xzf "geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz" -C /usr/local/bin && \
    rm "geckodriver-$GECKODRIVER_VERSION-linux64.tar.gz" && \
    chmod +x /usr/local/bin/geckodriver

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose port
EXPOSE 8000

# Run the application
# We use the shell script to handle startup logic (migrations, etc) if it's executable
# Otherwise we can call uvicorn directly. Let's make sure run_crm.sh is executable.
RUN chmod +x run_crm.sh

CMD ["./run_crm.sh"]
