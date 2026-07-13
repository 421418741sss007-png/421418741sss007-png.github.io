import os
import json

# ================= 配置项 =================
# 哪些文件夹或文件不需要被扫描进列表，可以在这里排除
EXCLUDE_DIRS = {'.git', '.github', 'node_modules'} 
CONFIG_FILE = 'config.json'
# =========================================

def scan_projects():
    project_list = []
    
    # 读取现有的配置，以便保留你之前人工写好的好看的“名称”
    existing_mapping = {}
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                old_data = json.load(f)
                # 建立 路径 -> 名称 的映射字典
                existing_mapping = {item['path']: item['name'] for item in old_data if 'path' in item}
        except Exception:
            # 如果原文件损坏或格式不对，就忽略它，直接重新生成
            pass

    # 扫描当前目录下的所有子目录
    for entry in os.scandir('.'):
        if entry.is_dir() and entry.name not in EXCLUDE_DIRS:
            # 统一使用相对路径格式，末尾加上斜杠
            relative_path = f"{entry.name}/"
            
            # 如果这个历史路径你之前起过名字，就沿用老名字；否则用文件夹名当临时名字
            name = existing_mapping.get(relative_path, entry.name)
            
            project_list.append({
                "name": name,
                "path": relative_path
            })
            
    # 按照路径名字排个序，让列表更整齐
    project_list.sort(key=lambda x: x['path'])

    # 写入到 config.json
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(project_list, f, ensure_ascii=False, indent=2)
        
    print(f"成功！已扫描并更新 {len(project_list)} 个子项目到 {CONFIG_FILE}")

if __name__ == '__main__':
    scan_projects()