

sudo docker build -t audio_anno .

sudo docker save -o audio_anno.tar audio_anno:latest

sudo docker run -d --name audio_anno_v1 --add-host=host.docker.internal:host-gateway -p 8800:80 audio_anno