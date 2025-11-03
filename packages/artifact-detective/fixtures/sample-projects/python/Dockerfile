FROM python:3.11.7-slim

WORKDIR /workspace

# Install exact versions from requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Output directory mounted as volume
RUN mkdir -p /output
