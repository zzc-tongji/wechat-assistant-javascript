# Dockerbuild

### Build

``` bash
docker build -t zzcgwu/wechat-assistant .
docker push zzcgwu/wechat-assistant .
```

### Cross-Platform Build

``` bash
docker buildx build -t zzcgwu/wechat-assistant --platform=linux/amd64 .

# https://segmentfault.com/a/1190000021166703
```
