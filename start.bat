@echo off
echo ========================================
echo   水利监测系统 - 一键启动
echo ========================================

cd backend
echo 正在启动后端服务...
start cmd /k "node index.js"

timeout /t 3
echo 正在打开浏览器...
start http://localhost:3000

echo 系统已启动！
echo 后端服务在独立窗口中运行，关闭该窗口即可停止服务