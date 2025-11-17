import SwiftUI
import Observation

struct ContentView: View {
    @Bindable var viewModel: TaylorSwiftDesignViewModel

    var body: some View {
        NavigationStack {
            SourceManagementView(viewModel: viewModel.sourceManager)
                .navigationTitle("源管理")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        if viewModel.sourceManager.hasActiveFilter {
                            Button("重置") {
                                viewModel.sourceManager.resetFilters()
                            }
                            .font(AgentFont.body(weight: .medium))
                        }
                    }
                }
                .background(AgentColor.background.ignoresSafeArea())
        }
    }
}

#Preview {
    ContentView(viewModel: TaylorSwiftDesignViewModel())
}

