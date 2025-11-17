import Foundation
import Observation
import SwiftUI

@Observable
final class SourceManagementViewModel {
    @ObservationIgnored private let repository: SourceRepository
    @ObservationIgnored private let preferenceStore: SourcePreferenceStore

    private var sources: [NewsSource] = []
    private var disabledSourceIDs: Set<Int> {
        didSet { preferenceStore.save(disabledIDs: disabledSourceIDs) }
    }

    var query: String = "" {
        didSet { updateSections() }
    }

    var selectedCategory: SourceCategory? {
        didSet { updateSections() }
    }

    private(set) var sections: [CategorySection] = []

    init(
        repository: SourceRepository = .shared,
        preferenceStore: SourcePreferenceStore = SourcePreferenceStore()
    ) {
        self.repository = repository
        self.preferenceStore = preferenceStore
        self.sources = repository.loadSources()
        self.disabledSourceIDs = preferenceStore.loadDisabledIDs()
        updateSections()
    }

    var metrics: [SourceMetric] {
        [
            .init(
                title: "全部",
                value: "\(sources.count)",
                subtitle: "已收录站点"
            ),
            .init(
                title: "启用",
                value: "\(enabledSourceCount)",
                subtitle: "当前参与抓取"
            ),
            .init(
                title: "RSS",
                value: "\(rssSourceCount)",
                subtitle: "实时推送"
            )
        ]
    }

    var hasActiveFilter: Bool {
        !query.isEmpty || selectedCategory != nil
    }

    func resetFilters() {
        query = ""
        selectedCategory = nil
    }

    func toggleSelection(for category: SourceCategory) {
        if selectedCategory == category {
            selectedCategory = nil
        } else {
            selectedCategory = category
        }
    }

    func binding(for source: NewsSource) -> Binding<Bool> {
        Binding(
            get: { self.isEnabled(source) },
            set: { self.update(source: source, enabled: $0) }
        )
    }

    func isEnabled(_ source: NewsSource) -> Bool {
        !disabledSourceIDs.contains(source.id)
    }

    var accessibleCategories: [SourceCategory] {
        sections.map(\.category)
    }
}

extension SourceManagementViewModel {
    struct CategorySection: Identifiable {
        let category: SourceCategory
        let sources: [NewsSource]
        var id: SourceCategory { category }
        var enabledCount: Int
    }

    struct SourceMetric: Identifiable {
        let id = UUID()
        let title: String
        let value: String
        let subtitle: String
    }
}

private extension SourceManagementViewModel {
    var enabledSourceCount: Int {
        sources.filter { isEnabled($0) }.count
    }

    var rssSourceCount: Int {
        sources.filter { $0.delivery == .rss }.count
    }

    func updateSections() {
        let filtered = sources
            .filter { source in
                guard query.isEmpty else {
                    return source.name.localizedCaseInsensitiveContains(query) ||
                    source.host.localizedCaseInsensitiveContains(query)
                }
                return true
            }
            .filter { source in
                guard let targetCategory = selectedCategory else {
                    return true
                }
                return source.category == targetCategory
            }

        let grouped = Dictionary(grouping: filtered, by: \.category)
        sections = SourceCategory.allCases.compactMap { category in
            guard let items = grouped[category] else { return nil }
            let sorted = items.sorted { $0.name < $1.name }
            let enabled = sorted.filter { isEnabled($0) }.count
            return CategorySection(category: category, sources: sorted, enabledCount: enabled)
        }
    }

    func update(source: NewsSource, enabled: Bool) {
        if enabled {
            disabledSourceIDs.remove(source.id)
        } else {
            disabledSourceIDs.insert(source.id)
        }
        updateSections()
    }
}

