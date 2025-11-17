import SwiftUI

struct SourceManagementView: View {
    @Bindable var viewModel: SourceManagementViewModel
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                headerSection
                metricSection
                categorySection
                sourceListSection
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .background(AgentColor.background.ignoresSafeArea())
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("AI 信息源总览")
                .font(AgentFont.title())
                .foregroundStyle(AgentColor.textPrimary)

            Text("统一查看、分组管理目前接入的 50+ AI 新闻源，随时决定哪些来源参与同步。")
                .font(AgentFont.body())
                .foregroundStyle(AgentColor.textSecondary)

            searchField
        }
    }

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(AgentColor.textSecondary)
            TextField("搜索站点或域名", text: $viewModel.query)
                .font(AgentFont.body())
                .foregroundStyle(AgentColor.textPrimary)
                .textInputAutocapitalization(.never)
                .disableAutocorrection(true)
                .focused($isSearchFocused)

            if !viewModel.query.isEmpty {
                Button {
                    viewModel.query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(AgentColor.textSecondary.opacity(0.6))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 12)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(AgentColor.card)
        )
    }

    private var metricSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(viewModel.metrics) { metric in
                    MetricCard(metric: metric)
                }
            }
            .padding(.top, 4)
        }
    }

    private var categorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("按来源类型查看")
                .font(AgentFont.headline())
                .foregroundStyle(AgentColor.textPrimary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(SourceCategory.allCases) { category in
                        CategoryChip(
                            category: category,
                            isSelected: viewModel.selectedCategory == category,
                            action: { viewModel.toggleSelection(for: category) }
                        )
                    }
                }
            }
        }
    }

    private var sourceListSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            ForEach(viewModel.sections) { section in
                SourceCategoryCard(
                    section: section,
                    toggleBindingProvider: viewModel.binding(for:),
                    tint: AgentColor.accent(for: section.category)
                )
            }

            if viewModel.sections.isEmpty {
                emptyState
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray")
                .font(.system(size: 32, weight: .semibold, design: .rounded))
                .foregroundStyle(AgentColor.textSecondary)

            Text("未找到匹配的来源")
                .font(AgentFont.headline())
                .foregroundStyle(AgentColor.textPrimary)

            Text("调整筛选条件或清空关键词以查看全部网站。")
                .font(AgentFont.body())
                .foregroundStyle(AgentColor.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(AgentColor.card)
        )
    }
}

private struct MetricCard: View {
    let metric: SourceManagementViewModel.SourceMetric

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(metric.title)
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)

            Text(metric.value)
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(AgentColor.accentPrimary)

            Text(metric.subtitle)
                .font(AgentFont.caption())
                .foregroundStyle(AgentColor.textSecondary)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(AgentColor.surface)
        )
    }
}

private struct CategoryChip: View {
    let category: SourceCategory
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: category.iconName)
                    .font(AgentFont.caption())
                Text(category.displayName)
                    .font(AgentFont.body(weight: .medium))
            }
            .foregroundStyle(isSelected ? AgentColor.background : AgentColor.textPrimary)
            .padding(.vertical, 8)
            .padding(.horizontal, 14)
            .background(
                Capsule(style: .continuous)
                    .fill(isSelected ? AgentColor.accent(for: category) : AgentColor.card)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct SourceCategoryCard: View {
    let section: SourceManagementViewModel.CategorySection
    let toggleBindingProvider: (NewsSource) -> Binding<Bool>
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Label(section.category.displayName, systemImage: section.category.iconName)
                    .font(AgentFont.headline())
                    .foregroundStyle(AgentColor.textPrimary)

                Spacer()

                Text("\(section.enabledCount)/\(section.sources.count)")
                    .font(AgentFont.caption(weight: .bold))
                    .foregroundStyle(tint)
            }

            Text(section.category.description)
                .font(AgentFont.body())
                .foregroundStyle(AgentColor.textSecondary)

            VStack(spacing: 10) {
                ForEach(section.sources) { source in
                    SourceRow(
                        source: source,
                        isEnabled: toggleBindingProvider(source),
                        tint: tint
                    )
                }
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(AgentColor.surface)
            )
        }
        .padding(18)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(AgentColor.card)
        )
    }
}

private struct SourceRow: View {
    let source: NewsSource
    @Binding var isEnabled: Bool
    let tint: Color

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(source.name)
                    .font(AgentFont.body(weight: .semibold))
                    .foregroundStyle(AgentColor.textPrimary)

                HStack(spacing: 6) {
                    Label(source.delivery.label, systemImage: source.delivery.iconName)
                        .font(AgentFont.caption())
                        .foregroundStyle(tint)

                    Text(source.host)
                        .font(AgentFont.caption())
                        .foregroundStyle(AgentColor.textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            Link(destination: source.url) {
                Image(systemName: "arrow.up.right.square.fill")
                    .font(.system(size: 18, weight: .semibold, design: .rounded))
                    .foregroundStyle(tint)
                    .padding(8)
                    .background(
                        Circle()
                            .fill(tint.opacity(0.15))
                    )
            }
            .buttonStyle(.plain)

            Toggle(isOn: $isEnabled) {
                EmptyView()
            }
            .labelsHidden()
            .tint(tint)
        }
        .contentShape(Rectangle())
    }
}

#Preview {
    SourceManagementView(viewModel: SourceManagementViewModel())
        .background(AgentColor.background)
}

