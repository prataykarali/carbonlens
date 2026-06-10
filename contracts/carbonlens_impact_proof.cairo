#[starknet::interface]
trait ICarbonLensImpactProof<TContractState> {
    fn record_proof(
        ref self: TContractState,
        proof_id: felt252,
        total_grams_co2e: u64,
        category_fingerprint: felt252,
        recorded_at: u64,
    );
    fn get_proof(self: @TContractState, proof_id: felt252) -> ImpactProof;
    fn get_proof_count(self: @TContractState) -> u64;
}

#[derive(Copy, Drop, Serde, starknet::Store)]
struct ImpactProof {
    total_grams_co2e: u64,
    category_fingerprint: felt252,
    recorded_at: u64,
    recorder: starknet::ContractAddress,
}

#[starknet::contract]
mod CarbonLensImpactProof {
    use super::{ICarbonLensImpactProof, ImpactProof};
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::{Map, StoragePointerReadAccess, StoragePointerWriteAccess};

    const MAX_TOTAL_GRAMS_CO2E: u64 = 100000000;

    #[storage]
    struct Storage {
        proofs: Map<felt252, ImpactProof>,
        proof_count: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        ImpactProofRecorded: ImpactProofRecorded,
    }

    #[derive(Drop, starknet::Event)]
    struct ImpactProofRecorded {
        #[key]
        proof_id: felt252,
        total_grams_co2e: u64,
        category_fingerprint: felt252,
        recorder: ContractAddress,
    }

    #[abi(embed_v0)]
    impl CarbonLensImpactProofImpl of ICarbonLensImpactProof<ContractState> {
        fn record_proof(
            ref self: ContractState,
            proof_id: felt252,
            total_grams_co2e: u64,
            category_fingerprint: felt252,
            recorded_at: u64,
        ) {
            assert(total_grams_co2e <= MAX_TOTAL_GRAMS_CO2E, 'TOTAL_TOO_HIGH');
            assert(recorded_at > 0, 'BAD_TIMESTAMP');

            let recorder = get_caller_address();
            let proof = ImpactProof {
                total_grams_co2e,
                category_fingerprint,
                recorded_at,
                recorder,
            };

            self.proofs.write(proof_id, proof);
            self.proof_count.write(self.proof_count.read() + 1);
            self.emit(Event::ImpactProofRecorded(ImpactProofRecorded {
                proof_id,
                total_grams_co2e,
                category_fingerprint,
                recorder,
            }));
        }

        fn get_proof(self: @ContractState, proof_id: felt252) -> ImpactProof {
            self.proofs.read(proof_id)
        }

        fn get_proof_count(self: @ContractState) -> u64 {
            self.proof_count.read()
        }
    }
}
