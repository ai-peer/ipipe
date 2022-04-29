# 代理隧道 ipipe

## 使用例子

```
    import IPipe from "@ai-lion/ipipe";
    import axios from "axios";

    
    let proxy = {
        host: "127.0.0.1",
        port: 1082,
        protocol: 'http',
        //username: 'user',
        //password: '12345'
        //forwardHost: "127.0.0.1",
        //forwardPort: 1082,
    };

    
    async function proxyIp(proxy: { host: string; port: number }) {
        let info = await axios({
            url: "http://ip-api.com/json",
            timeout: 15000,
            method: "get",
            proxy: {
                host: proxy.host,
                port: proxy.port,
                /**auth: {
                    username: "admin",
                    password: "123456",
                }, */
            },
        })
            .then((res) => res.data)
            .catch((err) => console.error("get proxy ip error", err.stack, err.message));
        console.info("proxy ip", info);
    }
    (async()=>{
        
        const ipipe = new IPipe(); //初始化实例

        await ipipe.createTestProxyServer(proxy.port, "0.0.0.0");// 测试使用的目标代理服务器, 实际使用中替换真实的代理服务器,目前支持http和socks5, 新协议自定义开发

        await ipipe.createAcceptServer(4321); //创建接入服务

        ipipe.registerProxy(proxy);//注册代理服务器

        proxyIp({ host: proxy.host, port: 4321 });


    })();
    


```
​
