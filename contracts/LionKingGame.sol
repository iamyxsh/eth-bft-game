// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

enum CharacterNames {
    SIMBA,
    SCAR,
    MUFASA
}

struct Character {
    uint256 id;
    address owner;
    CharacterNames name;
    uint8 level;
}

struct Challenge {
    uint256 id;
    address from;
    address to;
    uint256 fromId;
    uint256 toId;
    bool accepted;
    address winner;
}

contract LionKingGame is ERC1155, Ownable {
    uint256 public mintingFee = 0.001 ether;
    uint256 public meatFee = 0.00001 ether;
    uint256 private total = 2;
    uint256 private totalCharactersSupply = 3;
    uint256 private totalChalenges = 0;
    uint256 public winnerReward = 1 ether;

    uint8 public MEAT = 0;
    uint8 public TOKEN = 1;
    uint8 public meatQuantity = 10;

    mapping(uint256 => Character) public collection;
    mapping(uint256 => Challenge) public challenges;

    constructor() ERC1155("") {}

    function mintCharacter() external payable {
        require(msg.value == mintingFee, "please send proper fee");
        _generateCharacter();
    }

    function buyMeat() external payable {
        require(msg.value == meatFee, "please send proper fee");
        _mintMeat();
    }

    function feedMeat(uint256 _id, uint8 _qty) external payable {
        require(
            balanceOf(msg.sender, _id) == 1,
            "you can feed only your character"
        );
        _burnMeat(_qty);
        _levelUp(_id, _qty);
    }

    function totalCharacters() public view returns (uint256) {
        return total - 2;
    }

    function challenge(uint256 _fromId, uint256 _toId) external {
        require(
            balanceOf(msg.sender, _fromId) == 1,
            "you can only challenge with your own character"
        );
        Character memory _fromChar = collection[_fromId];
        Character memory _toChar = collection[_toId];

        Challenge memory _challenge = Challenge(
            totalChalenges,
            _fromChar.owner,
            _toChar.owner,
            _fromId,
            _toId,
            false,
            address(0)
        );

        challenges[totalChalenges] = _challenge;

        totalChalenges++;
    }

    function acceptChallenge(uint256 _id) external {
        Challenge storage _challenge = challenges[_id];

        require(
            _challenge.to == msg.sender,
            "you can only accept your own challenge"
        );
        _challenge.accepted = true;
    }

    function getWinner(uint256 _id) external returns (address) {
        Challenge storage _challenge = challenges[_id];

        require(
            msg.sender == _challenge.to || msg.sender == _challenge.from,
            "you are not involved in this challenge"
        );

        require(_challenge.accepted, "challenge is not accepted yet");

        Character memory _fromCharacter = collection[_challenge.fromId];
        Character memory _toCharacter = collection[_challenge.toId];

        address winner = _generateWinner(_fromCharacter, _toCharacter);
        _challenge.winner = winner;

        _rewardWinner(winner);

        return winner;
    }

    function transferMeat(address _to, uint256 _qty) external {
        _safeTransferFrom(msg.sender, _to, MEAT, _qty, "");
    }

    function _generateCharacter() internal {
        uint8 name = _generateRandomName();

        Character memory newCharacter = Character(
            total + 1,
            msg.sender,
            CharacterNames(name),
            0
        );

        _mint(msg.sender, total + 1, 1, "");
        collection[total + 1] = newCharacter;
        total++;
    }

    function _generateRandomName() internal view returns (uint8) {
        return
            uint8(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            block.timestamp,
                            msg.sender,
                            block.number
                        )
                    )
                ) % totalCharactersSupply
            );
    }

    function _mintMeat() internal {
        _mint(msg.sender, MEAT, meatQuantity, "");
    }

    function _burnMeat(uint256 _qty) internal {
        _burn(msg.sender, MEAT, _qty);
    }

    function _levelUp(uint256 _id, uint8 _qty) internal {
        uint8 _level = (_qty / 5) % 10;
        Character storage _character = collection[_id];

        if ((_level + _character.level) >= 10) {
            _character.level = 10;
        } else {
            _character.level += _level;
        }
    }

    function _generateWinner(Character memory _from, Character memory _to)
        internal
        view
        returns (address)
    {
        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.difficulty,
                    block.timestamp,
                    _from.owner,
                    _to.owner
                )
            )
        );

        uint256 fromRate = (uint256(_from.name) + 1) * (_from.level + 1);
        uint256 toRate = (uint256(_to.name) + 1) * (_to.level + 1);

        if (
            fromRate % ((randomNumber % toRate) + 1) >
            toRate % ((randomNumber % fromRate) + 1)
        ) {
            return _from.owner;
        } else {
            return _to.owner;
        }
    }

    function _rewardWinner(address _winner) internal {
        _mint(_winner, TOKEN, winnerReward, "");
    }
}
