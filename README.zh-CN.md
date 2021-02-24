# k-history

这是一个用于代替`history@4`的工具库，编写这个库主要是有以下原因：

- `history@4`的`HashRouter`不支持记录`state`
- `history@4`的`blocker`不支持异步回调
- `history@4`的`blocker`在中途刷新浏览器会失效
- `history@4`不能告诉我们用户点击的是前进还是后退
- `history@4`未直接将 search 转换为 object

刚好项目中遇到了需要监听浏览器动作的需求，就重写一个`history`好了。

文档完善中，[请先参考`history`的文档](https://github.com/ReactTraining/history/tree/master/docs)

## API
