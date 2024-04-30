import { NoConfig } from "@proto-kit/common";
import {
    RuntimeModule,
    state,
    runtimeMethod,
    runtimeModule,
} from "@proto-kit/module";
import { StateMap, assert } from "@proto-kit/protocol";
import { CircuitString, Field, Struct, Experimental, Provable, Character, PublicKey, UInt64, Poseidon } from "o1js";
import { PackedStringFactory } from "o1js-pack";
import { MessageValidator } from "./MessageValidation";


interface MinaChallenge4Config {
    messageMaxChars: Field;
}

export class String12 extends PackedStringFactory(12) {}
export class String2 extends PackedStringFactory(2) {}

await MessageValidator.compile();
export class MessageValidationProof extends Experimental.ZkProgram.Proof(MessageValidator) {}
export class Characters extends Struct({
    array: Provable.Array(Character,2)
}) {
    constructor(array: Character[]) {
        super({ array });
        this.array = array;
    }
}
export class Message extends Struct({
    messageNumber: Field,
    messageHash: Field,
    agentID: Field,
    securityCode: Characters,
}) {
    constructor(messageNumber: Field, messageHash: Field, agentID: Field, securityCode: Characters) {
        super({
            messageNumber,
            messageHash,
            agentID,
            securityCode
        });
        this.messageNumber = messageNumber;
        this.messageHash = messageHash;
        this.agentID = agentID;
        this.securityCode = securityCode;
    }
}



export class AgentState extends Struct({
    lastMessageNumber: Field,
    securityCodeHash: Field,
    agentID: Field
}) {
    constructor(lastMessageNumber: Field, securityCodeHash: Field, agentID: Field) {
        super({
            lastMessageNumber,
            securityCodeHash,
            agentID
        });
        this.lastMessageNumber = lastMessageNumber;
        this.securityCodeHash = securityCodeHash;
        this.agentID = agentID;
    }
}

export class AgentStateWithTxInfo extends Struct({
    lastMessageNumber: Field,
    securityCodeHash: Field,
    blockHeight: UInt64,
    nonce: UInt64,
    sender: PublicKey
}){
    constructor(lastMessageNumber: Field, securityCodeHash: Field, blockHeight: UInt64, nonce: UInt64, sender: PublicKey) {
        super({lastMessageNumber, securityCodeHash, blockHeight, nonce, sender});
        this.blockHeight = blockHeight;
        this.nonce = nonce;
        this.sender = sender;
    }

}
@runtimeModule()
export class MinaChallenge3 extends RuntimeModule<MinaChallenge4Config> {
    @state() public agentStates = StateMap.from<Field, AgentState>(
        Field,
        AgentState
    );

    @runtimeMethod()
    public populateAgents(): void {
        const agentID1 = Field(1);
        const agentID2 = Field(2);
        const agent1 = new AgentState(Field(0), Poseidon.hash([Character.fromString("1").value, Character.fromString("2").value]), agentID1);
        const agent2 = new AgentState(Field(0),  Poseidon.hash([Character.fromString("5").value, Character.fromString("6").value]), agentID2);
        this.agentStates.set(agentID1, agent1);
        this.agentStates.set(agentID2, agent2);
    }

    @runtimeMethod()
    public IsMessageValid(agentID: Field, messageNumber: Field, securityCode: Characters): boolean {
        Provable.log(securityCode, "Here sec code in ismesgavalid")
        const agentState = this.agentStates.get(agentID);
        assert(agentState.isSome, "Agent does not exist");
        assert(messageNumber.greaterThan(agentState.value.lastMessageNumber), "Message number is not greater than the last message number");
        assert(agentState.value.securityCodeHash.equals(Poseidon.hash([securityCode.array[0].value, securityCode.array[1].value])), "Security code does not match");

        return true;
    }

    @runtimeMethod()
    public submitMessage(proof: MessageValidationProof): void {}
}

export class AgentKeyAtBlock extends Struct({
    agentID: Field,
    blockHeight: UInt64
}) {
    constructor(agentID: Field, blockHeight: UInt64) {
        super({ agentID, blockHeight });
        this.agentID = agentID;
        this.blockHeight = blockHeight;
    }
}

@runtimeModule()
export class MinaChallenge4 extends MinaChallenge3 {
    @state() public agentStatesAtBlocks = StateMap.from<AgentKeyAtBlock, AgentStateWithTxInfo>(
        AgentKeyAtBlock,
        AgentStateWithTxInfo
    );
    @runtimeMethod()
    public override submitMessage(proof: MessageValidationProof): void {
        proof.verify();
        Provable.log(proof.publicInput.agentID, "Here in the proof public input")
        Provable.log(proof.publicInput.agentState.securityCodeHash, "Here security in proof input")
        this.network.block.height;
        assert(proof.publicOutput.isValid.equals(Field(1)), "Message is not valid");
        this.agentStates.set(proof.publicInput.agentID, new AgentState(proof.publicInput.agentState.lastMessageNumber.add(1), proof.publicInput.agentState.securityCodeHash, proof.publicInput.agentID));
        this.agentStatesAtBlocks.set(new AgentKeyAtBlock(proof.publicInput.agentID, this.network.block.height), new AgentStateWithTxInfo(proof.publicInput.agentState.lastMessageNumber.add(1), proof.publicInput.agentState.securityCodeHash, this.network.block.height, this.transaction.nonce.value, this.transaction.sender.value));
    }
}
