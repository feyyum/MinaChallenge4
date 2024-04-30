import { TestingAppChain } from "@proto-kit/sdk";
import { Character, CircuitString, Field, Poseidon, PrivateKey, UInt64} from "o1js";
import { log } from "@proto-kit/common";
import { AgentKeyAtBlock, Characters, Message, MessageValidationProof, MinaChallenge4, String12, String2 } from "../src/MinaChallenge4";
import { MessageValidator, MessageValidatorPrivateInputs, MessageValidatorPublicInputs } from "../src/MessageValidation";
import { mock } from "node:test";

log.setLevel("ERROR");

describe("MinaChallenge4", () => {
    const appChain = TestingAppChain.fromRuntime({
        modules: {
            MinaChallenge4,
        },
    });
    const alicePrivateKey = PrivateKey.random();
    const alice = alicePrivateKey.toPublicKey();
    let minaChallenge4: MinaChallenge4;
    beforeAll(async () => {
        appChain.configurePartial({
            Runtime: {
                MinaChallenge4: {
                    maxMessageChars: Field(12),
                },
            },
        });

        await appChain.start();

        appChain.setSigner(alicePrivateKey);

        minaChallenge4 = appChain.runtime.resolve("MinaChallenge4");
    }, 1_000_000_000);
    it("should populate agents", async () => {
        const tx0 = await appChain.transaction(alice, () => {
            minaChallenge4.populateAgents();
        });
        
        await tx0.sign();
        await tx0.send();
        const block1 = await appChain.produceBlock();

        const agentState = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));
        expect(block1?.transactions[0].status.toBoolean()).toBe(true);
        console.log(agentState?.lastMessageNumber, agentState?.securityCodeHash)
        expect(agentState?.lastMessageNumber.toBigInt()).toBe(BigInt(0));
        //expect(agentState?.securityCode.toString()).toBe("12");
    });
    it("should fail if message is invalid", async () => {
        const mock_message: Message = new Message(
            Field(2),
            Poseidon.hash([String12.fromString("Hello, Sorlo").packed]),
            Field(1),
            new Characters([Character.fromString("1"), Character.fromString("2")]));
        const tx1 = await appChain.transaction(alice, () => {
            minaChallenge4.IsMessageValid(mock_message.agentID, mock_message.messageNumber, mock_message.securityCode);
        });
        await tx1.sign();
        await tx1.send();
        const block1 = await appChain.produceBlock();
        console.log(block1?.transactions[0]);
        expect(block1?.transactions[0].status.toBoolean()).toBe(true);
        
        const mock_message2: Message = new Message(
            Field(4),
            Poseidon.hash([String12.fromString("Hello, World").packed]),
            Field(1),
            new Characters([Character.fromString("3"), Character.fromString("4")]));
        const tx2 = await appChain.transaction(alice, () => {
            minaChallenge4.IsMessageValid(mock_message2.agentID, mock_message2.messageNumber, mock_message2.securityCode);
        });
        await tx2.sign();
        await tx2.send();
        const block2 = await appChain.produceBlock();
        console.log(block2?.transactions[0]);
        expect(block2?.transactions[0].status.toBoolean()).toBe(false);
    }, 1_000_000_000);
    it("should succesfully submit multiple messages", async () => {
        const mock_message: MessageValidatorPrivateInputs = new MessageValidatorPrivateInputs(
            Field(5),
            String12.fromString("Hello, World"),
            Field(1),
            new Characters([Character.fromString("1"), Character.fromString("2")]));
        const agentState_1 = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));
        const mock_message_public_inputs_1 = new MessageValidatorPublicInputs(
            Field(1),
            agentState_1!!
        );
        const messageProof_1 = await MessageValidator.checkMessage(mock_message_public_inputs_1, mock_message);
        const tx1 = await appChain.transaction(alice, () => {
            minaChallenge4.submitMessage(messageProof_1);
        });
        await tx1.sign();
        await tx1.send();
        const block1 = await appChain.produceBlock();
        console.log(block1?.transactions[0]);
        expect(block1?.transactions[0].status.toBoolean()).toBe(true);
        
        const mock_message2: MessageValidatorPrivateInputs = new MessageValidatorPrivateInputs(
            Field(6),
            String12.fromString("Hello, World"),
            Field(1),
            new Characters([Character.fromString("1"), Character.fromString("2")]));
        const agentState_2 = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));
        const mock_message_public_inputs_2 = new MessageValidatorPublicInputs(
            Field(1),
            agentState_2!!
        );
        const messageProof_2 = await MessageValidator.checkMessage(mock_message_public_inputs_2, mock_message2);
        const tx2 = await appChain.transaction(alice, () => {
            minaChallenge4.submitMessage(messageProof_2);
        });
        await tx2.sign();
        await tx2.send();
        const block2 = await appChain.produceBlock();
        console.log(block2?.transactions[0]);
        expect(block2?.transactions[0].status.toBoolean()).toBe(true);
        
        const mock_message3: MessageValidatorPrivateInputs = new MessageValidatorPrivateInputs(
            Field(8),
            String12.fromString("Hello, World"),
            Field(1),
            new Characters([Character.fromString("1"), Character.fromString("2")]));
        const agentState_3 = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));
        const mock_message_public_inputs_3 = new MessageValidatorPublicInputs(
            Field(1),
            agentState_3!!
        );
        const messageProof_3 = await MessageValidator.checkMessage(mock_message_public_inputs_3, mock_message3);
        const tx3 = await appChain.transaction(alice, () => {
            minaChallenge4.submitMessage(messageProof_3);
        });
        await tx3.sign();
        await tx3.send();
        const block3 = await appChain.produceBlock();
        console.log(block3?.transactions[0]);
        expect(block3?.transactions[0].status.toBoolean()).toBe(true);
        
        const agentStateAfterSubmitMessage = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));
        expect(agentStateAfterSubmitMessage?.lastMessageNumber.toBigInt()).toBe(BigInt(3));
        //expect(agentStateAfterSubmitMessage?.securityCode.toString()).toBe("12");
        try {
            const mock_message4: MessageValidatorPrivateInputs = new MessageValidatorPrivateInputs(
                Field(9),
                String12.fromString("Hello, World"),
                Field(8),
                new Characters([Character.fromString("1"), Character.fromString("2")]));
            const agentState = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));
            const mock_message_public_inputs = new MessageValidatorPublicInputs(
                Field(8),
                agentState!!
            );
            const messageProof_4 = await MessageValidator.checkMessage(mock_message_public_inputs, mock_message4);
            const tx4 = await appChain.transaction(alice, () => {
                minaChallenge4.submitMessage(messageProof_4);
            });
            await tx4.sign();
            await tx4.send();
            const block4 = await appChain.produceBlock();
            console.log(block4?.transactions[0]);
            expect(block4?.transactions[0].status.toBoolean()).toBe(false);
        } catch (error: any) {
            console.log(error);
            const errorString: String = error.toString();
            expect(errorString.includes("Error: Agent ID must match")).toBeTruthy();
        }
        
    },1_000_000_000);
    it("should fail with wrong length of message", async () => {
        try {
            const mock_message: MessageValidatorPrivateInputs = new MessageValidatorPrivateInputs(
                    Field(9),
                    String12.fromString("Hello, Worlddddd"),
                    Field(1),
                    new Characters([Character.fromString("1"), Character.fromString("2")]))
            const agentState = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));
            const mock_message_public_inputs = new MessageValidatorPublicInputs(
                Field(1),
                agentState!!
            );
            await MessageValidator.checkMessage(
                mock_message_public_inputs, mock_message
            );
        } catch (error: any) {
            console.log(error);
            expect(error.toString()).toBe("Error: Input of size 16 is larger than expected size of 12");
        }
    });
    it("should get certain agent state at block", async () => {
        const mock_message: MessageValidatorPrivateInputs = new MessageValidatorPrivateInputs(
            Field(5),
            String12.fromString("Hello, World"),
            Field(1),
            new Characters([Character.fromString("1"), Character.fromString("2")]));
        const agentState = await appChain.query.runtime.MinaChallenge4.agentStates.get(Field(1));

        const mock_message_public_inputs = new MessageValidatorPublicInputs(
            Field(1),
            agentState!!);
        const messageProof_1 = await MessageValidator.checkMessage(mock_message_public_inputs, mock_message);
        const tx1 = await appChain.transaction(alice, () => {
            minaChallenge4.submitMessage(messageProof_1);
        });
        await tx1.sign();
        await tx1.send();
        const block1 = await appChain.produceBlock();
        console.log(block1?.transactions[0]);
        expect(block1?.transactions[0].status.toBoolean()).toBe(true);
        
        const agentStateAtBlock = await appChain.query.runtime.MinaChallenge4.agentStatesAtBlocks.get(new AgentKeyAtBlock(new Field(1), UInt64.from(block1!.height)));
        console.log(agentStateAtBlock);
        expect(agentStateAtBlock?.lastMessageNumber.toBigInt()).toBe(BigInt(4));
    }, 1_000_000_000);
});
