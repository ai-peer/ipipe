# 代理隧道 proxypipe

## 使用例子

```
    import ProxyServer from "@ai-lion/proxypipe";
    
    (async()=>{
        const proxyServer = new ProxyServer(); //初始化实例

        proxyServer.registerProxy({ //注册代理服务器
            host: "127.0.0.1",
            port: 1082,
            protocol: 'http',
            //username: 'user',
            //password: '12345'
        });
        proxyServer.createServer(); //创建代理服务

    })();
    


```
​
