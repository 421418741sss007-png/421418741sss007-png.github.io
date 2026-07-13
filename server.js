const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json());
// 将仓库根目录作为静态资源目录，方便直接预览
app.use(express.static(__dirname));

const CONFIG_PATH = path.join(__dirname, 'config.json');

// 辅助函数：执行终端命令（转为 Promise）
const runCommand = (cmd) => {
    return new Promise((resolve, reject) => {
        exec(cmd, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) reject(stderr || error.message);
            else resolve(stdout);
        });
    });
};

// 1. 获取所有项目列表 (查)
app.get('/api/projects', (req, res) => {
    if (!fs.existsSync(CONFIG_PATH)) {
        return res.json([]);
    }
    const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
    res.json(JSON.parse(data || '[]'));
});

// 2. 新增或修改项目 (增/改)
app.post('/api/projects', (req, res) => {
    const { name, path: projPath, isNew } = req.body;
    
    if (!name || !projPath) return res.status(400).json({ error: '名称和路径不能为空' });

    // 统一路径格式，确保以 / 结尾
    const formattedPath = projPath.endsWith('/') ? projPath : `${projPath}/`;
    const targetDir = path.join(__dirname, formattedPath);

    // 如果是新建项目，且文件夹不存在，自动帮你创建好，并塞一个基础的 index.html
    if (isNew && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
        fs.writeFileSync(
            path.join(targetDir, 'index.html'), 
            `<!DOCTYPE html><html><head><title>${name}</title></head><body><h1>${name} 工作区</h1></body></html>`
        );
    }

    // 更新 config.json
    let list = [];
    if (fs.existsSync(CONFIG_PATH)) {
        list = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8') || '[]');
    }

    const existingIndex = list.findIndex(item => item.path === formattedPath);
    if (existingIndex > -1) {
        list[existingIndex].name = name; // 修改
    } else {
        list.push({ name, path: formattedPath }); // 新增
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(list, null, 2), 'utf-8');
    res.json({ success: true, message: '配置已更新' });
});

// 3. 删除项目 (删)
app.delete('/api/projects', (req, res) => {
    const { path: projPath, deleteFolder } = req.body;
    if (!fs.existsSync(CONFIG_PATH)) return res.status(400).json({ error: '配置文件不存在' });

    let list = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8') || '[]');
    list = list.filter(item => item.path !== projPath);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(list, null, 2), 'utf-8');

    // 如果勾选了连带删除本地文件夹
    if (deleteFolder) {
        const targetDir = path.join(__dirname, projPath);
        if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
        }
    }

    res.json({ success: true, message: '项目已删除' });
});

// 4. 一键同步到 GitHub (同步)
app.post('/api/sync', async (req, res) => {
    try {
        const timeStr = new Date().toLocaleString();
        console.log('开始同步到 GitHub...');
        await runCommand('git add .');
        await runCommand(`git commit -m "自动同步: ${timeStr}"`);
        await runCommand('git push');
        res.json({ success: true, message: '已成功推送到 GitHub 仓库！' });
    } catch (err) {
        res.status(500).json({ error: `同步失败: ${err}` });
    }
});

app.listen(3000, () => console.log('管理后台已启动：http://localhost:3000'));