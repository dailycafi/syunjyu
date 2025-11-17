import Foundation

enum SourceCategory: String, CaseIterable, Identifiable, Codable {
    case research
    case academic
    case media
    case blog
    case newsletter
    case science

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .research:
            return "研究机构"
        case .academic:
            return "学术与预印本"
        case .media:
            return "科技媒体"
        case .blog:
            return "专业博客"
        case .newsletter:
            return "Newsletter"
        case .science:
            return "综合科技"
        }
    }

    var description: String {
        switch self {
        case .research:
            return "顶级实验室与模型团队的官方发布"
        case .academic:
            return "高校、研究院以及预印本推送"
        case .media:
            return "主流科技媒体的 AI 专栏"
        case .blog:
            return "深度博客与实践经验分享"
        case .newsletter:
            return "每日/每周精选通讯"
        case .science:
            return "综合科技与跨学科资讯"
        }
    }

    var iconName: String {
        switch self {
        case .research:
            return "brain"
        case .academic:
            return "building.columns"
        case .media:
            return "megaphone"
        case .blog:
            return "text.book.closed"
        case .newsletter:
            return "envelope.open"
        case .science:
            return "atom"
        }
    }
}

enum SourceDelivery: String, Codable {
    case rss
    case web

    var label: String {
        switch self {
        case .rss:
            return "RSS"
        case .web:
            return "网页"
        }
    }

    var iconName: String {
        switch self {
        case .rss:
            return "dot.radiowaves.left.and.right"
        case .web:
            return "safari"
        }
    }
}

struct NewsSource: Identifiable, Hashable, Codable {
    let id: Int
    let name: String
    let url: URL
    let rssURL: URL?
    let category: SourceCategory

    var delivery: SourceDelivery {
        rssURL == nil ? .web : .rss
    }

    var host: String {
        url.host ?? url.absoluteString
    }
}

