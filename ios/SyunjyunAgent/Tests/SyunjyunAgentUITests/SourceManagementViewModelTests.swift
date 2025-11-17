import XCTest
@testable import SyunjyunAgentUI

final class SourceManagementViewModelTests: XCTestCase {
    func testSelectingCategoryFiltersSections() {
        let viewModel = SourceManagementViewModel()
        viewModel.toggleSelection(for: .research)

        XCTAssertEqual(viewModel.sections.count, 1)
        XCTAssertEqual(viewModel.sections.first?.category, .research)
    }

    func testSearchQueryNarrowsSources() {
        let viewModel = SourceManagementViewModel()
        viewModel.query = "OpenAI"

        let sources = viewModel.sections.flatMap(\.sources)
        XCTAssertTrue(sources.contains(where: { $0.name == "OpenAI" }))
        XCTAssertFalse(sources.contains(where: { $0.name == "DeepMind" }))
    }

    func testResetFiltersRestoresAllSections() {
        let viewModel = SourceManagementViewModel()
        let baselineCount = viewModel.sections.count

        viewModel.query = "Anthropic"
        viewModel.resetFilters()

        XCTAssertEqual(viewModel.sections.count, baselineCount)
    }
}

