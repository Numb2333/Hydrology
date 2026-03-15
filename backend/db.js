// backend/db.js - 创建这个文件
const { Pool } = require('pg');
require('dotenv').config();

console.log('正在连接数据库...', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
});

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // 最大连接数
    idleTimeoutMillis: 30000, //连接空闲超时时间
    connectionTimeoutMillis: 2000, //连接超时时间
});

// 数据库连接事件
// pool.on(eventNames,listener);其中eventName想要监听的事件名称，例如‘connect’'error'等，listener是回调函数，当事件发生时，listener将被调用。
pool.on('connect', () => {
    console.log('✅ 数据库连接成功');
});

pool.on('error', (err) => {
    console.error('❌ 数据库连接错误:', err);
});

// 测试连接函数
//利用异步函数测试数据库连接是否成功
// 异步操作通常指的是那些不会立即完成的操作，比如从服务器获取数据、读取文件、数据库查询等。
// 这些操作需要时间来完成，JavaScript 会继续执行后续代码，而不会等待这些操作完成。异步函数提供了一种更清晰、更易读的方式来处理这些异步操作。
// async关键字：在函数声明前添加async关键字，表示该函数是一个异步函数。
// await关键字：在异步函数中，await关键字用于等待一个Promise对象，直到该Promise对象执行完毕后，才会继续执行后续代码。
// try...catch...finally：try...catch...finally是异常处理的常用模式，用于捕获并处理异步函数中的异常。
pool.testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log('✅ 数据库连接测试成功');
        client.release();
        return true;
    } catch (error) {
        console.error('❌ 数据库连接测试失败:', error.message);
        return false;
    }
};

//导出连接池对象
module.exports = pool;