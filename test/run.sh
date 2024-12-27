#!/bin/bash

# Update the system
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "Installing dependencies..."
sudo apt install -y git build-essential cmake libuv1-dev libssl-dev libhwloc-dev

# Clone XMRig repository
echo "Cloning XMRig repository..."
git clone https://github.com/xmrig/xmrig.git

# Build XMRig
echo "Building XMRig..."
cd xmrig
mkdir build && cd build
cmake ..
make

# Create configuration file with the provided configuration
echo "Creating XMRig configuration file..."
cat > config.json <<EOL
{
  "autosave": true,
  "cpu": true,
  "opencl": false,
  "cuda": false,
  "pools": [
    {
      "url": "pool.supportxmr.com:443",
      "user": "451Bc3UiBqgbZV2KUCthm1aMxcDjbekQr9FE3drcQLzHEf5pDzXjw4zAYB8nB7YnHwARGn43otTjDL8APs5Af73y7ADfRix",
      "pass": "account_1_1",
      "keepalive": true,
      "tls": true
    }
  ]
}
EOL

# Set huge pages (for optimal mining performance)
echo "Setting huge pages..."
sudo sysctl -w vm.nr_hugepages=128

echo "Monero mining setup complete. Configuration file is ready."

