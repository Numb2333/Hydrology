// 后端开发，使用Express框架时，主要核心步骤
// 1、加载模块：引入必要库和配置环境变量
// 2、中间件：设置CORS、解析JSON等，处理请求和响应之间的逻辑
// 3、静态文件：提供前端资源访问
// 4、数据库连接：创建数据库连接池，处理数据库操作
// 5、定义API路由：设置RESTful API接口，处理数据的增删改查，实现不同API处理业务逻辑
// 6、启动服务器：监听指定端口，提供服务



// backend/index.js
// const express = require('express');
// const cors = require('cors');
// backend/simple_index.js
console.log('='.repeat(50));
console.log('水利监测系统 - 简化版');
console.log('Node.js版本:', process.version);
console.log('='.repeat(50));

// Polyfill
if (!Object.hasOwn) {
    Object.hasOwn = function(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    };
}

// 一、加载模块
// express用于构建Web服务器，cors用于处理跨域请求，dotenv用于加载环境变量
const express = require('express'); //在Node.js中，通常会使用require来引入第三方库（
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 二、中间件
app.use(cors()); //允许跨域请求
app.use(express.json()); //允许解析JSON格式请求体，后端可以直接处理JSON数据

// 三、静态文件
const path = require('path');
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));  //通过express.static中间件，后端可以提供前端静态资源（如HTML、CSS、JavaScript文件）的访问。这使得前端页面可以直接通过服务器访问，而无需单独的前端服务器。

// 四、数据库连接（在需要时创建）
let pool = null;
function getPool() {
    if (!pool) {
        const { Pool } = require('pg');
        pool = new Pool({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });
        
        pool.on('connect', () => console.log('✅ 数据库连接成功'));
        pool.on('error', (err) => console.error('❌ 数据库错误:', err.message));
    }
    return pool;
}
// 五、定义API路由，get获取数据，post添加数据
// 1. 健康检查
// 定义一个用于健康检查的API路由
// 当客户端以get请求访问/api/health时，会触发路由处理函数
app.get('/api/health', (req, res) => {
    res.json({  //将JS对象转换为JSON格式并发送给客户端
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'hydrology-system'
    });
});

// 2. 获取所有站点（使用Promise处理异步）
app.get('/api/stations', (req, res) => {
    const pool = getPool();
    
    pool.query('SELECT station_id, station_name, latitude, longitude, elevation, region, status FROM stations')
        .then(result => {
            res.json(result.rows);
        })
        .catch(error => {
            console.error('数据库错误:', error);
            res.status(500).json({ error: '获取数据失败' });
        });
});

// 2.1 获取单个站点（使用async/await处理异步）
// app.get('/api/stations/:id',async(req,res)=>{
//     try{
//         const{ id } = req.params;
//         console.log(`📡 请求: GET /api/stations/${id}`);
//         //安全查询
//         const result = await pool.query(
//             'SELECT id, station_id,station_name,latitude,longitude,elevation,region,status FROM stations WHRTR station_id = $1',
//             [id]
//         );
//         console.log('查询结果:', {
//             stationId: id,
//             foundRows: result.rows.length,
//             rows: result.rows
//         });

//         if(result.rows.length === 0){
//             return res.status(404).json({ 
//                 error: '站点未找到' 
//             });
//         }
//         console.log(`✅ 返回站点 ${id} 的完整详情`);
//         res.json(result.rows[0]);
        
//     }catch(error){
//         console.log('❌ 获取站点详情失败:', error);
//         res.status(500).json({error:'站点获取失败'})

//     }

// })

// 3. 获取站点数据
app.get('/api/stations/:id/data', (req, res) => {
    const { id } = req.params;
    const limit = req.query.limit || 10;
    const pool = getPool();
    
    pool.query(
        'SELECT record_date, rainfall, temperature, humidity, wind_speed FROM station_data WHERE station_id = $1 ORDER BY record_date DESC LIMIT $2',
        [id, limit]
    )
    .then(result => {
        res.json(result.rows);
    })
    .catch(error => {
        console.error('数据库错误:', error);
        res.status(500).json({ error: '获取数据失败' });
    });
});

// 3. 添加站点
app.post('/api/stations', (req, res) => {
    const { station_id, station_name, latitude, longitude, region,elevation } = req.body;
    const pool = getPool();
    
    if (!station_id || !station_name || !latitude || !longitude) {
        return res.status(400).json({ error: '缺少必要字段' });
    }
    
    pool.query(
        'INSERT INTO stations (station_id, station_name, latitude, longitude, region,elevation) VALUES ($1, $2, $3, $4, $5,$6) RETURNING *',
        [station_id, station_name, latitude, longitude, region || '', elevation || null]
    )
    .then(result => {
        res.status(201).json({
            success: true,
            data: result.rows[0],
            message: '站点添加成功'
        });
    })
    .catch(error => {
        console.error('添加失败:', error);
        if (error.code === '23505') {
            res.status(409).json({ error: '站点ID已存在' });
        } else {
            res.status(500).json({ error: '添加失败' +error.message});
        }
    });
});

// 首页
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// 六、启动服务器
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 服务器启动成功！');
    console.log('='.repeat(50));
    console.log(`地址: http://localhost:${PORT}`);
    // console.log(`API: http://localhost:${PORT}/api/stations/${id}`)
    console.log(`API: http://localhost:${PORT}/api/stations`);
    console.log('='.repeat(50));
    
    // 测试数据库连接（非阻塞）
    setTimeout(() => {
        const pool = getPool();
        pool.query('SELECT NOW()')
            .then(result => {
                console.log('✅ 数据库连接成功');
                console.log('数据库时间:', result.rows[0].now);
            })
            .catch(err => {
                console.log('❌ 数据库连接失败:', err.message);
            });
    }, 1000);
});