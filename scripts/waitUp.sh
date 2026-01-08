#!/usr/bin/env bash

service_dns=$1
service_port=$2

while ! nc -z -w 2 "${service_dns}" "${service_port}"; do
  echo "Waiting up for ${service_dns}..."
  sleep 2
done
