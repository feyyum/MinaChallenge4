import { Bool, Character, Experimental, Field, Poseidon, Provable, Struct } from "o1js";
import { PackedStringFactory } from "o1js-pack";
import { assert } from "@proto-kit/protocol";

export class String12 extends PackedStringFactory(12) {}
export class String2 extends PackedStringFactory(2) {}
export class Characters extends Struct({
    array: Provable.Array(Character,2)
}) {
    constructor(array: Character[]) {
        super({ array });
        this.array = array;
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

export class MessageValidatorPublicInputs extends Struct({
    agentID: Field,
    agentState: AgentState,
}) {
    constructor(agentID: Field, agentState: AgentState) {
        super({ agentID, agentState });
        this.agentState = agentState;
    }
}
export class MessageValidatorPrivateInputs extends Struct({
    messageNumber: Field,
    messageText: String12,
    agentID: Field,
    securityCode: Characters
}) {
    constructor(messageNumber: Field, messageText: String12, agentID: Field, securityCode: Characters) {
        super({
            messageNumber,
            messageText,
            agentID,
            securityCode
        });
        this.messageText = messageText;
        this.agentID = agentID;
        this.messageNumber = messageNumber;
        this.securityCode = securityCode;
    }

}

export class MessageValidatorPublicOutputs extends Struct({
    securityCodeHash: Field,
    isValid: Field
}) {
    constructor(securityCodeHash: Field, isValid: Field) {
        super({ securityCodeHash, isValid });
        this.isValid = isValid;
        this.securityCodeHash = securityCodeHash;
    }
}

function checkMessageLength(message: String12) {
    String12.check(message);
    let messageLength = Field(0);

    let messageAsArray = String12.unpack(message.packed);
    for(let i = 0; i < messageAsArray.length; i++) {
        Provable.if(messageAsArray.at(i)?.isNull().not() ?? Bool(false), messageLength = messageLength.add(Field(1)), messageLength = messageLength)
    }
    /* let messageAsArray = Provable.Array(Field, 12);
    let length = Field(0);
    messageAsArray.map( value => { return Provable.if(value.equals().not() && value.equals(Field(0)).not(), length = length.add(1), length = length);})
    return length.equals(Field(12)); */
    return messageLength.equals(Field(12));
}
export const MessageValidator = Experimental.ZkProgram({
    name: "MessageValidator",
    publicInput: MessageValidatorPublicInputs,
    publicOutput: MessageValidatorPublicOutputs,
    methods: {
        checkMessage: {
            privateInputs: [MessageValidatorPrivateInputs],
            method(inputs: MessageValidatorPublicInputs, message: MessageValidatorPrivateInputs) {
                    message.messageNumber.assertGreaterThan(inputs.agentState.lastMessageNumber, "Message number must be greater than the last message number");
                inputs.agentState.securityCodeHash.assertEquals(Poseidon.hash([message.securityCode.array[0].value, message.securityCode.array[1].value]), "Security code hash must match");
                inputs.agentState.agentID.assertEquals(message.agentID, "Agent ID must match");
                return Provable.if(checkMessageLength(message.messageText),MessageValidatorPublicOutputs, new MessageValidatorPublicOutputs(inputs.agentState.securityCodeHash, Field(1)), new MessageValidatorPublicOutputs(inputs.agentState.securityCodeHash, Field(0)));
            },
        },
    },
});
