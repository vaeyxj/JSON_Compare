# JSON差异比较工具

可视化展示JSON结构差异，特别支持：
- 数组顺序变化检测
- 内容修改高亮
- 实时对比反馈

## 使用方式
1. 安装依赖：`npm install`
2. 启动服务：`npm start`
3. 在左右两侧输入/粘贴JSON内容
4. 点击【比较JSON】查看差异


## 本地&线上环境关键点说明：
使用HashRouter代替BrowserRouter来兼容GitHub Pages的静态路由
homepage配置改为相对路径
添加404页面处理客户端路由
部署分支指定为gh-pages
现在访问地址应为：
本地开发：http://localhost:3000
生产环境：https://yourusername.github.io/repo-name
如果仍然遇到路由问题，可以尝试以下额外步骤：
在public目录添加CNAME文件（如果使用自定义域名）
2. 确保GitHub仓库设置中：
Settings → Pages → Branch设置为gh-pages
路径为/(root)
3. 清除浏览器缓存后测试
