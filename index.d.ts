export declare class ProxyPipe<T> {
   id: string;
   createAt: Date;
   constructor(data?: { [key: string]: any });
   //protected getColumn(name: string): any;
   //protected getColumns(): any;
   /**
    * 补充没有初始化的值， 采用定义的默认值
    * @param object
    */
   patch(object?: { [key: string]: any }): this;
   /**
    * 去除不是定义的字段
    * @param object
    */
   reduce(object: { [key: string]: any }): T;
   /**
    * xss过滤
    * @param fieldName
    */
   xss(fieldName: string): any;
   toJSON(): {
      [key: string]: any;
   };
   /**
    * 是不是字段
    * @param name
    * @returns
    */
   isField(name: string): boolean;
   /**
    * 定义字段列表
    */
   get fields(): string[];
}

export default ProxyPipe;
