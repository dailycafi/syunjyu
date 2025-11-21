#!/usr/bin/env python3
"""
重新初始化新闻源数据库
使用最新的URL配置
"""

import sys
import os

# 添加父目录到路径以导入模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python-backend'))

from news_fetcher import init_news_sources_db, NEWS_SOURCES
from db import get_connection

def reinit_sources():
    """重新初始化源数据库"""
    print(f"\n{'='*80}")
    print("重新初始化新闻源数据库...")
    print(f"{'='*80}\n")
    
    # 清空现有数据
    print("清空旧数据...")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM news_sources")
    conn.commit()
    conn.close()
    print("✅ 旧数据已清空")
    
    # 初始化新数据
    print(f"\n初始化 {len(NEWS_SOURCES)} 个新闻源...")
    init_news_sources_db()
    print("✅ 新数据已初始化")
    
    # 显示统计
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category, COUNT(*) as count FROM news_sources GROUP BY category")
    results = cursor.fetchall()
    
    print(f"\n{'='*80}")
    print("新闻源统计:")
    print(f"{'='*80}\n")
    
    total = 0
    for row in results:
        category = row['category']
        count = row['count']
        total += count
        print(f"  {category}: {count}")
    
    print(f"\n  总计: {total}")
    
    # 显示禁用的源（被注释的）
    disabled_sources = [
        "NVIDIA AI Blog (404)",
        "Adept AI (403)",
        "Allen AI (404)",
        "VentureBeat AI (429)",
        "The Verge AI (404)",
        "Marktechpost (404)",
        "There's an AI For That (403)",
        "O'Reilly Radar AI (404)",
        "AI Trends (503)"
    ]
    
    print(f"\n{'='*80}")
    print(f"已禁用的源 ({len(disabled_sources)}):")
    print(f"{'='*80}\n")
    
    for source in disabled_sources:
        print(f"  ❌ {source}")
    
    conn.close()
    
    print(f"\n✅ 重新初始化完成！")

if __name__ == "__main__":
    reinit_sources()

