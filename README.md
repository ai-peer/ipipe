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

    
    async function testProxy(proxy: { host: string; port: number }) {
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
        
        //step1
        //===== 创建接入客户端， 默认可以通过http和socks5协议接入代理
        const ipipe = new IPipe(); //初始化实例
        await ipipe.createAcceptServer(4321); //创建接入服务kk, 4321 端口是本地接入的端口 
        ipipe.registerProxy(proxy);//注册代理服务器
        


        //step2 可以跳过, 这里是模拟目标代理服务器
        const ipipe2 = new IPipe({
            isDirect: true, //不能少这个参数
        }); //初始化实例
        await ipipe2.createAcceptServer(proxy.port); //创建接入服务



        //测试代理
        testProxy({ host: "127.0.0.1", port: 4321 });


    })();
    


```
​
