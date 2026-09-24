FROM python:3.11-slim

# Install system dependencies (build-essential, curl, libasound2 for audio if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    espeak \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download required NLTK corpora (punkt, vader_lexicon, wordnet)
RUN python -m nltk.downloader punkt vader_lexicon wordnet averaged_perceptron_tagger stopwords

# Copy all application files
COPY . .

# Set environment
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

EXPOSE 8080

# Run uvicorn on $PORT provided by Cloud Run
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
