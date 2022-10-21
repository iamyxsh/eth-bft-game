import { expect } from "chai"
import { ethers } from "hardhat"

describe("LionKingGame", function () {
	async function deployContract() {
		const LionKingGame = await ethers.getContractFactory("LionKingGame")
		const game = await LionKingGame.deploy()

		return game
	}

	describe("Deployment", function () {
		it("should deploy with correct data", async function () {
			const game = await deployContract()

			const [owner] = await ethers.getSigners()

			expect(ethers.utils.isAddress(game.address)).to.be.true
			expect(await game.mintingFee()).to.be.equal(
				(await game.mintingFee()).toNumber()
			)
			expect(await game.owner()).to.be.equal(owner.address)
		})
	})

	describe("Minting", function () {
		it("should mint with correct data", async function () {
			const game = await deployContract()

			const [_, player1] = await ethers.getSigners()

			await game.connect(player1).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			{
				let { id, name, level } = await game.collection(3)

				expect(id).to.be.equal(3)
				expect(level).to.be.equal(0)
				expect(name).to.be.lte(3)
				expect(name).to.be.gte(0)

				expect(await game.balanceOf(player1.address, 3)).to.be.equal(1)
				expect(await game.totalCharacters()).to.be.equal(1)
			}

			await game.connect(player1).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			{
				let { id, name, level } = await game.collection(4)

				expect(id).to.be.equal(4)
				expect(level).to.be.equal(0)
				expect(name).to.be.lte(3)
				expect(name).to.be.gte(0)

				expect(await game.totalCharacters()).to.be.equal(2)
				expect(await game.balanceOf(player1.address, 4)).to.be.equal(1)
			}
		})

		it("should not mint without proper fee", async function () {
			const game = await deployContract()

			const [_, player1] = await ethers.getSigners()

			await expect(
				game
					.connect(player1)
					.mintCharacter({ value: ethers.utils.parseEther("0.0009") })
			).to.revertedWith("please send proper fee")
		})
	})

	describe("Breed", function () {
		it("should allows player to buy meat", async function () {
			const game = await deployContract()

			const [_, player1] = await ethers.getSigners()

			await game.connect(player1).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game
				.connect(player1)
				.buyMeat({ value: (await game.meatFee()).toString() })

			expect(
				await game.balanceOf(player1.address, await game.MEAT())
			).to.be.equal(10)
		})

		it("should allows player to feed meat and level up", async function () {
			const game = await deployContract()

			const [_, player1] = await ethers.getSigners()

			await game.connect(player1).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game
				.connect(player1)
				.buyMeat({ value: (await game.meatFee()).toString() })

			await game.connect(player1).feedMeat(3, 5)

			expect(
				await game.balanceOf(player1.address, await game.MEAT())
			).to.be.equal(5)

			expect((await game.collection(3)).level).to.be.equal(1)
		})

		it("should allows player to feed meat to its character only", async function () {
			const game = await deployContract()

			const [_, player1, player2] = await ethers.getSigners()

			await game
				.connect(player1)
				.buyMeat({ value: (await game.meatFee()).toString() })

			await expect(game.connect(player2).feedMeat(1, 5)).to.revertedWith(
				"you can feed only your character"
			)
		})
	})

	describe("Fight", function () {
		it("should allow players to challenge for a fight", async function () {
			const game = await deployContract()

			const [_, player1, player2] = await ethers.getSigners()

			await game.connect(player1).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game.connect(player2).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game.connect(player2).challenge(4, 3)

			const { id, from, to, winner } = await game.challenges(0)

			expect(id).to.be.equal(0)
			expect(from).to.be.equal(player2.address)
			expect(to).to.be.equal(player1.address)
			expect(winner).to.be.equal(ethers.constants.AddressZero)
		})

		it("should allow players to accept challenge", async function () {
			const game = await deployContract()

			const [_, player1, player2] = await ethers.getSigners()

			await game.connect(player1).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game.connect(player2).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game.connect(player2).challenge(4, 3)

			await game.connect(player1).acceptChallenge(0)

			const { accepted } = await game.challenges(0)

			expect(accepted).to.be.true
		})

		it("should allow players see the winner", async function () {
			const game = await deployContract()

			const [_, player1, player2] = await ethers.getSigners()

			await game.connect(player1).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game.connect(player2).mintCharacter({
				value: (await game.mintingFee()).toString(),
			})

			await game.connect(player2).challenge(4, 3)

			await game.connect(player1).acceptChallenge(0)

			await game.connect(player1).getWinner(0)

			const { winner } = await game.challenges(0)

			expect(winner).to.not.be.equal(ethers.constants.AddressZero)
			expect(await game.balanceOf(winner, await game.TOKEN())).to.be.equal(
				await game.winnerReward()
			)
		})
	})

	describe("Misc", function () {
		it("should allow players to transfer meat", async function () {
			const game = await deployContract()

			const [_, player1, player2] = await ethers.getSigners()

			await game
				.connect(player1)
				.buyMeat({ value: (await game.meatFee()).toString() })

			await game.connect(player1).transferMeat(player2.address, 5)

			expect(
				await game.balanceOf(player2.address, await game.MEAT())
			).to.be.equal(5)
		})
	})
})
