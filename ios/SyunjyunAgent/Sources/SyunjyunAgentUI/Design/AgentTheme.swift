import SwiftUI

enum AgentColor {
    static let background = Color("CloudLilac")
    static let surface = Color("GoldenChampagne").opacity(0.18)
    static let card = Color("TaylorGlow").opacity(0.12)
    static let accentPrimary = Color("SunsetRose")
    static let accentSecondary = Color("MidnightViolet")
    static let textPrimary = Color("TextPrimary")
    static let textSecondary = Color("TextSecondary")

    static func accent(for category: SourceCategory) -> Color {
        switch category {
        case .research:
            return Color("SunsetRose")
        case .academic:
            return Color("MidnightViolet")
        case .media:
            return Color("TaylorGlow")
        case .blog:
            return Color("GoldenChampagne")
        case .newsletter:
            return Color("CloudLilac")
        case .science:
            return Color("TextPrimary")
        }
    }
}

enum AgentFont {
    static func title(weight: Font.Weight = .semibold) -> Font {
        .system(.title2, design: .rounded).weight(weight)
    }

    static func headline(weight: Font.Weight = .semibold) -> Font {
        .system(.headline, design: .rounded).weight(weight)
    }

    static func body(weight: Font.Weight = .regular) -> Font {
        .system(.body, design: .rounded).weight(weight)
    }

    static func caption(weight: Font.Weight = .medium) -> Font {
        .system(.caption, design: .rounded).weight(weight)
    }
}

