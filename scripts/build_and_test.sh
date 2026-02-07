#!/bin/bash
set -e
# Если mvn есть — используем его, иначе через Docker
if command -v mvn &>/dev/null; then
  mvn clean install
  mvn test
else
  docker run --rm -v "$(pwd):/app" -w /app maven:3.9-eclipse-temurin-17 mvn clean install
  docker run --rm -v "$(pwd):/app" -w /app maven:3.9-eclipse-temurin-17 mvn test
fi