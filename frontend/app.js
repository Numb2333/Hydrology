// frontend/app.js - 完整可用的版本
console.log('水利监测系统前端加载中...');

// 全局变量
let map = null;
let stationsLayer = null;
let stations = [];
let selectedStation = null;

// 初始化函数
function init() {
    console.log('初始化应用...');
    initMap();
    loadStations();
    updateSystemInfo();
    
    // 设置按钮事件（如果HTML中已经有onclick，这里作为备用）
    document.getElementById('refreshBtn')?.addEventListener('click', loadStations);
    document.getElementById('addStationBtn')?.addEventListener('click', showAddStationForm);
    
    console.log('应用初始化完成');
}

// 初始化地图
function initMap() {
    console.log('初始化地图...');
    
    try {
        // 创建地图
        map = new ol.Map({
            target: 'map',
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.XYZ({
                        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                    })
                })
            ],
            view: new ol.View({
                center: ol.proj.fromLonLat([116.4, 39.9]), // 北京
                zoom: 5
            })
        });
        
        // 创建站点图层
        stationsLayer = new ol.layer.Vector({
            source: new ol.source.Vector()
        });
        map.addLayer(stationsLayer);
        
        // 地图点击事件
        map.on('click', function(event) {
            const feature = map.forEachFeatureAtPixel(event.pixel, function(feat) {
                return feat;
            });
            
            if (feature) {
                const station = feature.get('station');
                selectStation(station);
            }
        });
        
        console.log('✅ 地图初始化成功');
    } catch (error) {
        console.error('❌ 地图初始化失败:', error);
        document.getElementById('map').innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h3>地图加载失败</h3>
                <p>错误: ${error.message}</p>
                <p>请检查OpenLayers是否正确加载</p>
            </div>
        `;
    }
}
// 1. 选择站点时显示完整信息
async function selectStation(station) {
    console.log('选择站点:', station);
    
    selectedStation = station;
    
    // 显示详情面板
    const detailPanel = document.getElementById('stationDetail');
    if (detailPanel) {
        detailPanel.style.display = 'block';
        
        // 更新详情内容（确保所有字段都有）
        document.getElementById('detailName').textContent = station.station_name || '--';
        document.getElementById('detailId').textContent = station.station_id || '--';
        // 修复这里：确保经纬度是数字
        const lat = parseFloat(station.latitude);
        const lng = parseFloat(station.longitude);
        // 修复位置显示
        if (!isNaN(lat) && !isNaN(lng)) {
            document.getElementById('detailLocation').textContent = 
                `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        } else {
            document.getElementById('detailLocation').textContent = '--';
        }
        
        // 修复海拔显示
        const elevation = parseFloat(station.elevation);
        if (!isNaN(elevation)) {
            document.getElementById('detailElevation').textContent = `${elevation} 米`;
        } else {
            document.getElementById('detailElevation').textContent = '--';
        }
        
        document.getElementById('detailRegion').textContent = station.region || '--';
        document.getElementById('detailStatus').textContent = station.status || 'active';
      
        
        
        // 加载站点数据
        await loadStationData(station.station_id);
    }
    
    // 地图聚焦
    if (map && station.latitude && station.longitude) {
        map.getView().animate({
            center: ol.proj.fromLonLat([station.longitude, station.latitude]),
            zoom: 10,
            duration: 1000
        });
    }
}
// ==================== 通过ID选择站点 ====================
function selectStationById(stationId) {
    const station = stations.find(s => s.station_id === stationId);
    if (station) {
        selectStation(station);
    }
}
// ==================== 加载站点数据（修复版）====================
async function loadStationData(stationId) {
    console.log(`加载站点 ${stationId} 的监测数据...`);
    
    const tableBody = document.getElementById('dataTableBody');
    if (!tableBody) {
        console.warn('找不到数据表格');
        return;
    }
    
    // 显示加载中
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; color: #999;">
                正在加载数据...
            </td>
        </tr>
    `;
    
    try {
        const response = await fetch(`/api/stations/${stationId}/data?limit=20`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('收到监测数据:', data);
        
        // 处理数据
        let dataArray = [];
        if (Array.isArray(data)) {
            dataArray = data;
        } else if (data && data.data && Array.isArray(data.data)) {
            dataArray = data.data;
        }
        
        // 更新表格
        if (dataArray.length > 0) {
            tableBody.innerHTML = dataArray.map(row => {
                // 格式化日期
                let dateStr = '--';
                try {
                    if (row.record_date) {
                        const date = new Date(row.record_date);
                        dateStr = date.toLocaleDateString('zh-CN');
                    }
                } catch (e) {
                    console.warn('日期格式化失败:', e);
                }
                
                // 格式化数值
                const formatValue = (value) => {
                    if (value === null || value === undefined || value === '') {
                        return '--';
                    }
                    const num = parseFloat(value);
                    return isNaN(num) ? '--' : num.toFixed(1);
                };
                
                return `
                    <tr>
                        <td>${dateStr}</td>
                        <td>${formatValue(row.rainfall)}</td>
                        <td>${formatValue(row.temperature)}</td>
                        <td>${formatValue(row.humidity)}</td>
                        <td>${formatValue(row.wind_speed)}</td>
                    </tr>
                `;
            }).join('');
            
            console.log(`✅ 显示 ${dataArray.length} 条监测数据`);
            
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 20px; color: #999;">
                        该站点暂无监测数据
                    </td>
                </tr>
            `;
        }
        
    } catch (error) {
        console.error('❌ 加载监测数据失败:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #ff4d4f;">
                    加载失败: ${error.message}
                </td>
            </tr>
        `;
    }
}

// ==================== 加载站点 ====================
async function loadStations() {
    console.log('正在加载站点...');
    
    try {
        const response = await fetch('/api/stations');
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status}`);
        }
        
        stations = await response.json();
        console.log(`✅ 加载了 ${stations.length} 个站点`);
        
        // 检查数据并转换为数字类型
        stations.forEach(station => {
            // 确保经纬度是数字
            station.latitude = parseFloat(station.latitude);
            station.longitude = parseFloat(station.longitude);
            station.elevation = parseFloat(station.elevation);
            
            // 检查转换结果
            if (isNaN(station.latitude) || isNaN(station.longitude)) {
                console.warn(`站点 ${station.station_id} 经纬度无效:`, 
                    station.latitude, station.longitude);
            }
        });
        
        updateStationList();
        updateMapStations();
        updateSystemInfo();
        
    } catch (error) {
        console.error('❌ 加载站点失败:', error);
        alert('加载站点数据失败: ' + error.message);
    }
}

// 更新站点列表（修复版）
function updateStationList() {
    const stationList = document.getElementById('stationList');
    if (!stationList) {
        console.warn('找不到stationList元素');
        return;
    }
    
    // 获取筛选值
    const regionFilter = document.getElementById('regionFilter');
    const selectedRegion = regionFilter ? regionFilter.value : '';
    
    console.log('筛选条件 - 区域:', selectedRegion);
    console.log('总站点数:', stations.length);
    
    // 筛选站点
    let filteredStations = stations;
    if (selectedRegion) {
        filteredStations = stations.filter(station => {
            // 处理区域数据可能为null或undefined的情况
            const stationRegion = station.region || '';
            return stationRegion.includes(selectedRegion) || 
                   selectedRegion.includes(stationRegion);
        });
    }
    
    console.log('筛选后站点数:', filteredStations.length);
    
    // 生成HTML
    if (filteredStations.length === 0) {
        stationList.innerHTML = `
            <div class="no-data">
                <p>${selectedRegion ? `在"${selectedRegion}"区域未找到站点` : '暂无站点数据'}</p>
                ${selectedRegion ? '<button onclick="clearFilter()">清除筛选</button>' : ''}
            </div>
        `;
    } else {
        stationList.innerHTML = filteredStations.map(station => {
            const isActive = selectedStation && selectedStation.station_id === station.station_id;
            return `
                <div class="station-item ${isActive ? 'active' : ''}" 
                     onclick="selectStationById('${station.station_id}')">
                    <div class="station-name">${station.station_name}</div>
                    <div class="station-info">
                        <span>ID: ${station.station_id}</span> | 
                        <span>区域: ${station.region || '未设置'}</span> |
                        <span>状态: ${station.status || 'active'}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // 更新站点数量显示
    updateStationCount(filteredStations.length);
}

// 清除筛选
function clearFilter() {
    const regionFilter = document.getElementById('regionFilter');
    if (regionFilter) {
        regionFilter.value = '';
    }
    filterStations();
}

// 更新站点数量显示
function updateStationCount(count) {
    const stationCount = document.getElementById('stationCount');
    if (stationCount) {
        stationCount.textContent = count;
        
        // 添加筛选提示
        const regionFilter = document.getElementById('regionFilter');
        if (regionFilter && regionFilter.value) {
            stationCount.textContent = `${count} (${regionFilter.value})`;
        }
    }
}

// 更新地图上的站点
function updateMapStations() {
    if (!stationsLayer) return;
    
    stationsLayer.getSource().clear();
    
    const features = stations.map(station => {
        const feature = new ol.Feature({
            geometry: new ol.geom.Point(
                ol.proj.fromLonLat([station.longitude, station.latitude])
            )
        });
        
        feature.set('station', station);
        
        // 设置样式
        const color = station.status === 'active' ? '#1890ff' : '#ff4d4f';
        feature.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                radius: 6,
                fill: new ol.style.Fill({ color: color }),
                stroke: new ol.style.Stroke({
                    color: 'white',
                    width: 2
                })
            })
        }));
        
        return feature;
    });
    
    stationsLayer.getSource().addFeatures(features);
}

// 通过ID选择站点
function selectStationById(stationId) {
    const station = stations.find(s => s.station_id === stationId);
    if (station) {
        selectStation(station);
    }
}

// 选择站点
async function selectStation(station) {
    console.log('选择站点:', station.station_name);
    
    selectedStation = station;
    
    // 更新列表选中状态
    document.querySelectorAll('.station-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // 显示详情面板
    const detailPanel = document.getElementById('stationDetail');
    if (detailPanel) {
        detailPanel.style.display = 'block';
        
        // 更新详情内容
        document.getElementById('detailName').textContent = station.station_name;
        document.getElementById('detailId').textContent = station.station_id;
        document.getElementById('detailLocation').textContent = 
            `${station.latitude.toFixed(4)}, ${station.longitude.toFixed(4)}`;
        document.getElementById('detailElevation').textContent = station.elevation || '--';
        document.getElementById('detailRegion').textContent = station.region || '--';
        document.getElementById('detailStatus').textContent = station.status || 'active';
        
        // 加载站点数据
        await loadStationData(station.station_id);
    }
    
    // 地图聚焦
    if (map && station) {
        map.getView().animate({
            center: ol.proj.fromLonLat([station.longitude, station.latitude]),
            zoom: 10,
            duration: 1000
        });
    }
}

// 加载站点数据
async function loadStationData(stationId) {
    try {
        const response = await fetch(`/api/stations/${stationId}/data?limit=10`);
        const data = await response.json();
        
        const tableBody = document.getElementById('dataTableBody');
        if (tableBody) {
            tableBody.innerHTML = data.map(row => `
                <tr>
                    <td>${new Date(row.record_date).toLocaleDateString()}</td>
                    <td>${row.rainfall || '--'}</td>
                    <td>${row.temperature || '--'}</td>
                    <td>${row.humidity || '--'}</td>
                    <td>${row.wind_speed || '--'}</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('加载站点数据失败:', error);
    }
}

// 显示添加站点表单
function showAddStationForm() {
    console.log('显示添加站点表单');
    const modal = document.getElementById('addStationModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// 添加站点
async function addStation(event) {
    event.preventDefault();
    console.log('添加站点...');
    
    const form = document.getElementById('addStationForm');
    const formData = new FormData(form);
    
    const stationData = {
        station_id: formData.get('stationId'),
        station_name: formData.get('stationName'),
        latitude: parseFloat(formData.get('latitude')),
        longitude: parseFloat(formData.get('longitude')),
        region: formData.get('region'),
        elevation: formData.get('elevation') ? parseFloat(formData.get('elevation')) : null
    };
    
    try {
        const response = await fetch('/api/stations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(stationData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('站点添加成功！');
            closeModal();
            loadStations(); // 重新加载站点列表
        } else {
            alert('添加失败: ' + (result.error || '未知错误'));
        }
    } catch (error) {
        console.error('添加站点失败:', error);
        alert('添加站点失败: ' + error.message);
    }
}

// 关闭模态框
function closeModal() {

    document.getElementById('addStationModal').style.display = 'none';
    document.getElementById('addDataModal').style.display = 'none';
    
    // 重置表单
    document.getElementById('addStationForm')?.reset();
    document.getElementById('addDataForm')?.reset();




}

// 关闭详情面板
function closeDetail() {
    const detailPanel = document.getElementById('stationDetail');
    if (detailPanel) {
        detailPanel.style.display = 'none';
    }
    selectedStation = null;
}

// 更新系统信息
function updateSystemInfo() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        lastUpdate.textContent = new Date().toLocaleString();
    }
}

// 筛选站点
function filterStations() {
    updateStationList();
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 暴露函数给全局作用域（供HTML中的onclick调用）
window.loadStations = loadStations;
window.filterStations = filterStations;
window.showAddStationForm = showAddStationForm;
window.selectStationById = selectStationById;
window.closeModal = closeModal;
window.closeDetail = closeDetail;
window.addStation = addStation;