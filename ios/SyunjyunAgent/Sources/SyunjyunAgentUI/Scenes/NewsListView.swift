import SwiftUI

struct NewsListView: View {
    @State private var viewModel = NewsViewModel()
    @EnvironmentObject var userPrefs: UserPreferenceStore
    
    var body: some View {
        Group {
            VStack(spacing: 0) {
                if viewModel.isLoading && viewModel.newsItems.isEmpty {
                    ProgressView("Loading news...")
                        .frame(maxHeight: .infinity)
                } else if let error = viewModel.errorMessage, viewModel.newsItems.isEmpty {
                    VStack {
                        Text("Error")
                            .font(.headline)
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Button("Retry") {
                            Task { await viewModel.loadNews() }
                        }
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    List {
                        ForEach(viewModel.newsItems) { item in
                            NavigationLink(destination: NewsDetailView(newsItem: item)) {
                                NewsRow(item: item)
                            }
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                        }
                    }
                    .listStyle(.plain)
                    .refreshable {
                        await viewModel.refresh()
                    }
                }
            } // End VStack
        }
        .background(AgentColor.background.ignoresSafeArea())
        .task {
            await viewModel.loadNews()
        }
        .navigationTitle("AI Daily")
    }
}

struct NewsRow: View {
    let item: NewsItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(item.source)
                .font(AgentFont.caption(weight: .bold))
                .foregroundStyle(AgentColor.accentPrimary)
            
            Text(item.title)
                .font(AgentFont.title(weight: .semibold)) // Adjusted for list
                .foregroundStyle(AgentColor.textPrimary)
                .lineLimit(3)
            
            Text(item.summary)
                .font(AgentFont.body())
                .foregroundStyle(AgentColor.textSecondary)
                .lineLimit(3)
            
            HStack {
                Text(item.date)
                    .font(AgentFont.caption())
                    .foregroundStyle(AgentColor.textSecondary)
                Spacer()
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(AgentColor.card)
                .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        )
        .padding(.vertical, 4)
    }
}

