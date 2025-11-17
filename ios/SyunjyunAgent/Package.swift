// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "SyunjyunAgent",
    defaultLocalization: "en",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "SyunjyunAgentUI",
            targets: ["SyunjyunAgentUI"]
        )
    ],
    targets: [
        .target(
            name: "SyunjyunAgentUI",
            resources: [
                .process("Resources/Assets.xcassets")
            ]
        ),
        .testTarget(
            name: "SyunjyunAgentUITests",
            dependencies: ["SyunjyunAgentUI"]
        )
    ]
)
