#!/usr/bin/env python3
"""
检查所有AI新闻源的可用性
生成报告并标记不可用的源
"""

import sys
import os
import asyncio
import httpx
from datetime import datetime

# 添加父目录到路径以导入模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'python-backend'))

from news_fetcher import NEWS_SOURCES
from db import get_connection

async def check_source_url(url: str, timeout: float = 10.0) -> dict:
    """
    检查单个URL的可用性
    
    Returns:
        dict: {
            'status': 'success' | 'redirect' | 'error',
            'status_code': int,
            'message': str,
            'redirect_url': str (可选)
        }
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
        
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            # 先尝试HEAD请求
            try:
                response = await client.head(url, headers=headers)
                
                # 检查重定向
                if 300 <= response.status_code < 400:
                    redirect_url = response.headers.get('location', '')
                    return {
                        'status': 'redirect',
                        'status_code': response.status_code,
                        'message': f'重定向到: {redirect_url}',
                        'redirect_url': redirect_url
                    }
                
                # 检查成功
                if response.status_code < 400:
                    return {
                        'status': 'success',
                        'status_code': response.status_code,
                        'message': '可访问'
                    }
                
                # 错误状态码
                return {
                    'status': 'error',
                    'status_code': response.status_code,
                    'message': f'HTTP错误: {response.status_code}'
                }
                
            except (httpx.RequestError, httpx.HTTPStatusError):
                # HEAD失败，尝试GET
                response = await client.get(url, headers=headers)
                
                if response.status_code < 400:
                    return {
                        'status': 'success',
                        'status_code': response.status_code,
                        'message': '可访问 (通过GET)'
                    }
                
                return {
                    'status': 'error',
                    'status_code': response.status_code,
                    'message': f'HTTP错误: {response.status_code}'
                }
                
    except httpx.TimeoutException:
        return {
            'status': 'error',
            'status_code': 0,
            'message': '请求超时'
        }
    except Exception as e:
        return {
            'status': 'error',
            'status_code': 0,
            'message': f'连接失败: {str(e)}'
        }

async def check_all_sources():
    """检查所有源并生成报告"""
    print(f"\n{'='*80}")
    print(f"开始检查 {len(NEWS_SOURCES)} 个AI新闻源...")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*80}\n")
    
    results = []
    
    for i, source in enumerate(NEWS_SOURCES, 1):
        print(f"[{i}/{len(NEWS_SOURCES)}] 检查 {source['name']}...", end=' ', flush=True)
        
        result = await check_source_url(source['url'])
        result['source'] = source
        results.append(result)
        
        # 打印结果
        status_icon = {
            'success': '✅',
            'redirect': '🔄',
            'error': '❌'
        }[result['status']]
        
        print(f"{status_icon} {result['message']}")
        
        # 避免请求太快
        await asyncio.sleep(0.5)
    
    # 生成汇总报告
    print(f"\n{'='*80}")
    print("检查完成 - 汇总报告")
    print(f"{'='*80}\n")
    
    success_count = sum(1 for r in results if r['status'] == 'success')
    redirect_count = sum(1 for r in results if r['status'] == 'redirect')
    error_count = sum(1 for r in results if r['status'] == 'error')
    
    print(f"✅ 可访问: {success_count}")
    print(f"🔄 需要重定向: {redirect_count}")
    print(f"❌ 不可访问: {error_count}")
    print(f"📊 总计: {len(results)}")
    print()
    
    # 详细列出问题源
    if redirect_count > 0:
        print(f"\n{'='*80}")
        print("需要重定向的源 (建议更新URL):")
        print(f"{'='*80}\n")
        for r in results:
            if r['status'] == 'redirect':
                print(f"  {r['source']['name']}")
                print(f"    当前: {r['source']['url']}")
                print(f"    建议: {r.get('redirect_url', 'N/A')}")
                print()
    
    if error_count > 0:
        print(f"\n{'='*80}")
        print("不可访问的源 (建议禁用):")
        print(f"{'='*80}\n")
        for r in results:
            if r['status'] == 'error':
                print(f"  [{r['source']['id']}] {r['source']['name']}")
                print(f"    URL: {r['source']['url']}")
                print(f"    错误: {r['message']}")
                print()
    
    return results

async def update_database_status(results):
    """根据检查结果更新数据库中的状态"""
    print(f"\n{'='*80}")
    print("更新数据库状态...")
    print(f"{'='*80}\n")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    disabled_count = 0
    
    for result in results:
        source = result['source']
        
        # 如果源不可访问，禁用它
        if result['status'] == 'error':
            cursor.execute(
                "UPDATE news_sources SET enabled = 0 WHERE id = ?",
                (source['id'],)
            )
            if cursor.rowcount > 0:
                disabled_count += 1
                print(f"  ❌ 已禁用: {source['name']}")
    
    conn.commit()
    conn.close()
    
    print(f"\n已禁用 {disabled_count} 个不可访问的源")

async def fix_redirect_urls():
    """修复已知的重定向URL"""
    print(f"\n{'='*80}")
    print("修复已知的重定向URL...")
    print(f"{'='*80}\n")
    
    # 已知需要修复的URL
    fixes = {
        "https://www.bensbites.co/": "https://bensbites.com/",
        "https://ai.googleblog.com": "https://blog.research.google/",
        "https://blogs.microsoft.com/ai/": "https://news.microsoft.com/source/topics/ai/",
        "https://www.microsoft.com/research/blog/": "https://www.microsoft.com/en-us/research/blog/",
        "https://txt.cohere.com/": "https://cohere.com/blog",
        "https://research.runwayml.com/": "https://runwayml.com/research",
        "https://www.nytimes.com/topic/subject/artificial-intelligence": "https://www.nytimes.com/spotlight/artificial-intelligence",
        "https://theresanaiforthat.com/newsletter/": "https://theresanaiforthat.com/s/newsletter/",
        "https://spectrum.ieee.org/artificial-intelligence": "https://spectrum.ieee.org/topic/artificial-intelligence/",
        "https://paperswithcode.com/": "https://huggingface.co/papers/trending"
    }
    
    conn = get_connection()
    cursor = conn.cursor()
    
    fixed_count = 0
    
    for old_url, new_url in fixes.items():
        cursor.execute(
            "UPDATE news_sources SET url = ? WHERE url = ?",
            (new_url, old_url)
        )
        if cursor.rowcount > 0:
            fixed_count += 1
            print(f"  🔄 已更新: {old_url} -> {new_url}")
    
    conn.commit()
    conn.close()
    
    print(f"\n已修复 {fixed_count} 个重定向URL")

async def main():
    """主函数"""
    # 检查所有源
    results = await check_all_sources()
    
    # 询问是否要更新数据库
    print(f"\n{'='*80}")
    response = input("是否要禁用不可访问的源并修复重定向? (y/n): ")
    
    if response.lower() == 'y':
        await fix_redirect_urls()
        await update_database_status(results)
        print("\n✅ 数据库已更新")
    else:
        print("\n⏭️  跳过数据库更新")
    
    # 保存报告到文件
    report_file = os.path.join(os.path.dirname(__file__), '..', 'source-check-report.txt')
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"AI新闻源检查报告\n")
        f.write(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"{'='*80}\n\n")
        
        for result in results:
            source = result['source']
            f.write(f"[{source['id']}] {source['name']}\n")
            f.write(f"  URL: {source['url']}\n")
            f.write(f"  分类: {source['category']}\n")
            f.write(f"  状态: {result['status']} - {result['message']}\n")
            if 'redirect_url' in result:
                f.write(f"  重定向: {result['redirect_url']}\n")
            f.write("\n")
    
    print(f"\n📄 详细报告已保存到: {report_file}")

if __name__ == "__main__":
    asyncio.run(main())

