/**
 * Letters to Syunjyu - Main JavaScript
 * 清新简洁的信件风格主题
 */

(function() {
    'use strict';

    // 页面加载完成后执行
    document.addEventListener('DOMContentLoaded', function() {
        initScrollEffects();
        initShareButtons();
        initImageLightbox();
    });

    /**
     * 滚动效果 - 头部固定时的样式变化
     */
    function initScrollEffects() {
        const header = document.querySelector('.site-header');
        if (!header) return;

        let lastScroll = 0;
        const scrollThreshold = 50;

        window.addEventListener('scroll', function() {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > scrollThreshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // 隐藏/显示头部（可选功能）
            if (currentScroll > lastScroll && currentScroll > 200) {
                header.classList.add('header-hidden');
            } else {
                header.classList.remove('header-hidden');
            }
            
            lastScroll = currentScroll;
        }, { passive: true });
    }

    /**
     * 分享按钮功能
     */
    function initShareButtons() {
        // 复制链接按钮
        const copyButtons = document.querySelectorAll('.share-copy');
        copyButtons.forEach(function(button) {
            button.addEventListener('click', function() {
                const url = window.location.href;
                navigator.clipboard.writeText(url).then(function() {
                    button.classList.add('copied');
                    
                    // 显示提示
                    const originalTitle = button.getAttribute('title');
                    button.setAttribute('title', '已复制！');
                    
                    setTimeout(function() {
                        button.classList.remove('copied');
                        button.setAttribute('title', originalTitle);
                    }, 2000);
                });
            });
        });

        // 社交分享窗口
        const shareLinks = document.querySelectorAll('.share-twitter, .share-facebook');
        shareLinks.forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const url = this.getAttribute('href');
                window.open(url, 'share', 'width=550,height=450,toolbar=0,menubar=0,location=0');
            });
        });
    }

    /**
     * 图片灯箱效果
     */
    function initImageLightbox() {
        const contentImages = document.querySelectorAll('.gh-content img:not(.kg-image-card img)');
        
        contentImages.forEach(function(img) {
            img.style.cursor = 'zoom-in';
            img.addEventListener('click', function() {
                openLightbox(this.src, this.alt);
            });
        });
    }

    /**
     * 打开灯箱
     */
    function openLightbox(src, alt) {
        // 创建灯箱元素
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-backdrop"></div>
            <div class="lightbox-content">
                <img src="${src}" alt="${alt || ''}">
                <button class="lightbox-close" aria-label="关闭">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            .lightbox {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: lightboxFadeIn 0.3s ease;
            }
            .lightbox-backdrop {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
            }
            .lightbox-content {
                position: relative;
                max-width: 90vw;
                max-height: 90vh;
            }
            .lightbox-content img {
                max-width: 100%;
                max-height: 90vh;
                object-fit: contain;
                border-radius: 4px;
            }
            .lightbox-close {
                position: absolute;
                top: -40px;
                right: 0;
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 8px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            .lightbox-close:hover {
                opacity: 1;
            }
            @keyframes lightboxFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(lightbox);
        document.body.style.overflow = 'hidden';

        // 点击关闭
        lightbox.addEventListener('click', function(e) {
            if (e.target === lightbox || 
                e.target.classList.contains('lightbox-backdrop') ||
                e.target.closest('.lightbox-close')) {
                closeLightbox(lightbox, style);
            }
        });

        // ESC 键关闭
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                closeLightbox(lightbox, style);
                document.removeEventListener('keydown', escHandler);
            }
        });
    }

    /**
     * 关闭灯箱
     */
    function closeLightbox(lightbox, style) {
        lightbox.style.animation = 'lightboxFadeIn 0.2s ease reverse';
        setTimeout(function() {
            lightbox.remove();
            style.remove();
            document.body.style.overflow = '';
        }, 200);
    }

    /**
     * 平滑滚动到锚点
     */
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

})();
