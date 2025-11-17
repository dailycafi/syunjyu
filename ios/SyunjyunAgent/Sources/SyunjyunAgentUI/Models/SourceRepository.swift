import Foundation

struct SourceRepository {
    static let shared = SourceRepository()

    private let sources: [NewsSource]

    init() {
        sources = SourceRepository.buildSources()
    }

    func loadSources() -> [NewsSource] {
        sources
    }
}

private extension SourceRepository {
    static func buildSources() -> [NewsSource] {
        [
            // Research institutions & labs
            .init(id: 1, name: "OpenAI", url: makeURL("https://openai.com/news"), rssURL: makeURL("https://openai.com/news/rss.xml"), category: .research),
            .init(id: 2, name: "DeepMind", url: makeURL("https://deepmind.google/blog"), rssURL: nil, category: .research),
            .init(id: 3, name: "Google AI Blog", url: makeURL("https://ai.googleblog.com"), rssURL: makeURL("https://ai.googleblog.com/feeds/posts/default"), category: .research),
            .init(id: 4, name: "Google Research", url: makeURL("https://research.google/blog"), rssURL: makeURL("https://research.google/blog/feed/"), category: .research),
            .init(id: 5, name: "Meta AI", url: makeURL("https://ai.meta.com/blog"), rssURL: makeURL("https://ai.meta.com/blog/rss/"), category: .research),
            .init(id: 6, name: "Microsoft AI Blog", url: makeURL("https://blogs.microsoft.com/ai/"), rssURL: makeURL("https://blogs.microsoft.com/ai/feed/"), category: .research),
            .init(id: 7, name: "Microsoft Research", url: makeURL("https://www.microsoft.com/research/blog/"), rssURL: makeURL("https://www.microsoft.com/research/feed/"), category: .research),
            .init(id: 8, name: "NVIDIA AI Blog", url: makeURL("https://blogs.nvidia.com/tag/ai/"), rssURL: makeURL("https://blogs.nvidia.com/tag/ai/feed/"), category: .research),
            .init(id: 9, name: "Anthropic", url: makeURL("https://www.anthropic.com/news"), rssURL: nil, category: .research),
            .init(id: 10, name: "Stability AI", url: makeURL("https://stability.ai/news"), rssURL: nil, category: .research),
            .init(id: 11, name: "Hugging Face", url: makeURL("https://huggingface.co/blog"), rssURL: nil, category: .research),
            .init(id: 12, name: "Cohere", url: makeURL("https://txt.cohere.com/"), rssURL: nil, category: .research),
            .init(id: 13, name: "Mistral AI", url: makeURL("https://mistral.ai/news/"), rssURL: nil, category: .research),
            .init(id: 14, name: "xAI", url: makeURL("https://x.ai/blog"), rssURL: nil, category: .research),
            .init(id: 15, name: "Scale AI", url: makeURL("https://scale.com/blog"), rssURL: nil, category: .research),
            .init(id: 16, name: "Runway ML", url: makeURL("https://research.runwayml.com/"), rssURL: nil, category: .research),
            .init(id: 17, name: "Adept AI", url: makeURL("https://www.adept.ai/blog"), rssURL: nil, category: .research),
            .init(id: 18, name: "EleutherAI", url: makeURL("https://blog.eleuther.ai/"), rssURL: nil, category: .research),

            // Academic & preprints
            .init(id: 19, name: "arXiv cs.AI", url: makeURL("https://arxiv.org/list/cs.AI/recent"), rssURL: makeURL("https://arxiv.org/rss/cs.AI"), category: .academic),
            .init(id: 20, name: "arXiv cs.CL", url: makeURL("https://arxiv.org/list/cs.CL/recent"), rssURL: makeURL("https://arxiv.org/rss/cs.CL"), category: .academic),
            .init(id: 21, name: "arXiv stat.ML", url: makeURL("https://arxiv.org/list/stat.ML/recent"), rssURL: makeURL("https://arxiv.org/rss/stat.ML"), category: .academic),
            .init(id: 22, name: "arXiv Blog", url: makeURL("https://blog.arxiv.org"), rssURL: makeURL("https://blog.arxiv.org/feed/"), category: .academic),
            .init(id: 23, name: "Allen AI (AI2)", url: makeURL("https://allenai.org/news"), rssURL: nil, category: .academic),
            .init(id: 24, name: "MIT CSAIL", url: makeURL("https://www.csail.mit.edu/news"), rssURL: makeURL("https://www.csail.mit.edu/rss/news"), category: .academic),
            .init(id: 25, name: "Stanford HAI", url: makeURL("https://hai.stanford.edu/news"), rssURL: nil, category: .academic),

            // Tech media AI sections
            .init(id: 26, name: "VentureBeat AI", url: makeURL("https://venturebeat.com/category/ai/"), rssURL: makeURL("https://venturebeat.com/category/ai/feed/"), category: .media),
            .init(id: 27, name: "TechCrunch AI", url: makeURL("https://techcrunch.com/category/artificial-intelligence/"), rssURL: makeURL("https://techcrunch.com/category/artificial-intelligence/feed/"), category: .media),
            .init(id: 28, name: "The Verge AI", url: makeURL("https://www.theverge.com/artificial-intelligence"), rssURL: makeURL("https://www.theverge.com/rss/artificial-intelligence/index.xml"), category: .media),
            .init(id: 29, name: "Wired AI", url: makeURL("https://www.wired.com/tag/artificial-intelligence/"), rssURL: makeURL("https://www.wired.com/feed/tag/ai/latest/rss"), category: .media),
            .init(id: 30, name: "MIT Tech Review AI", url: makeURL("https://www.technologyreview.com/topic/artificial-intelligence/"), rssURL: makeURL("https://www.technologyreview.com/topic/artificial-intelligence/feed/"), category: .media),
            .init(id: 31, name: "NYT AI", url: makeURL("https://www.nytimes.com/topic/subject/artificial-intelligence"), rssURL: nil, category: .media),
            .init(id: 32, name: "Financial Times AI", url: makeURL("https://www.ft.com/artificial-intelligence"), rssURL: nil, category: .media),
            .init(id: 33, name: "AI News", url: makeURL("https://www.artificialintelligence-news.com/"), rssURL: makeURL("https://www.artificialintelligence-news.com/feed/"), category: .media),
            .init(id: 34, name: "AI Business", url: makeURL("https://aibusiness.com/"), rssURL: makeURL("https://aibusiness.com/rss.xml"), category: .media),
            .init(id: 35, name: "AI Magazine", url: makeURL("https://aimagazine.com/"), rssURL: nil, category: .media),

            // Data science & AI blogs
            .init(id: 36, name: "Analytics Vidhya", url: makeURL("https://www.analyticsvidhya.com/blog/category/artificial-intelligence/"), rssURL: makeURL("https://www.analyticsvidhya.com/feed/"), category: .blog),
            .init(id: 37, name: "KDnuggets", url: makeURL("https://www.kdnuggets.com/news/index.html"), rssURL: makeURL("https://www.kdnuggets.com/feed"), category: .blog),
            .init(id: 38, name: "Towards Data Science", url: makeURL("https://towardsdatascience.com/"), rssURL: nil, category: .blog),
            .init(id: 39, name: "Marktechpost", url: makeURL("https://www.marktechpost.com/category/ai/"), rssURL: makeURL("https://www.marktechpost.com/feed/"), category: .blog),
            .init(id: 40, name: "TopBots", url: makeURL("https://www.topbots.com/"), rssURL: nil, category: .blog),

            // Newsletters
            .init(id: 41, name: "The Batch (DeepLearning.AI)", url: makeURL("https://www.deeplearning.ai/the-batch/"), rssURL: nil, category: .newsletter),
            .init(id: 42, name: "Import AI", url: makeURL("https://jack-clark.net/"), rssURL: nil, category: .newsletter),
            .init(id: 43, name: "Last Week in AI", url: makeURL("https://lastweekin.ai/"), rssURL: nil, category: .newsletter),
            .init(id: 44, name: "Ben's Bites", url: makeURL("https://www.bensbites.co/"), rssURL: nil, category: .newsletter),
            .init(id: 45, name: "The Rundown AI", url: makeURL("https://www.therundown.ai/"), rssURL: nil, category: .newsletter),
            .init(id: 46, name: "There's an AI For That", url: makeURL("https://theresanaiforthat.com/newsletter/"), rssURL: nil, category: .newsletter),
            .init(id: 47, name: "Inside AI", url: makeURL("https://inside.com/ai"), rssURL: nil, category: .newsletter),
            .init(id: 48, name: "TLDR AI", url: makeURL("https://tldr.tech/ai"), rssURL: nil, category: .newsletter),

            // General science & tech
            .init(id: 49, name: "ScienceDaily AI", url: makeURL("https://www.sciencedaily.com/news/computers_math/artificial_intelligence/"), rssURL: makeURL("https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml"), category: .science),
            .init(id: 50, name: "IEEE Spectrum AI", url: makeURL("https://spectrum.ieee.org/artificial-intelligence"), rssURL: makeURL("https://spectrum.ieee.org/feeds/artificial-intelligence.rss"), category: .science),
            .init(id: 51, name: "O'Reilly Radar AI", url: makeURL("https://www.oreilly.com/radar/topics/ai/"), rssURL: nil, category: .science),

            // Additional sources
            .init(id: 52, name: "AI Trends", url: makeURL("https://www.aitrends.com/"), rssURL: makeURL("https://www.aitrends.com/feed/"), category: .media),
            .init(id: 53, name: "Synced", url: makeURL("https://syncedreview.com/"), rssURL: nil, category: .media),
            .init(id: 54, name: "Papers with Code", url: makeURL("https://paperswithcode.com/"), rssURL: nil, category: .academic)
        ]
    }

    static func makeURL(_ string: String) -> URL {
        guard let url = URL(string: string) else {
            preconditionFailure("Invalid URL string: \(string)")
        }
        return url
    }
}

