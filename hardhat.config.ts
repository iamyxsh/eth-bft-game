import { HardhatUserConfig } from "hardhat/config"
import "@nomicfoundation/hardhat-toolbox"
import "hardhat-watcher"

interface WatcherConfig extends HardhatUserConfig {
	watcher?: any
}

const config: WatcherConfig = {
	solidity: "0.8.17",
	watcher: {
		test: {
			tasks: [{ command: "test" }],
			files: ["./test/**/*", "**/*.sol"],
			verbose: true,
			clearOnStart: true,
			start: "echo Running my test task now..",
		},
	},
}

export default config
