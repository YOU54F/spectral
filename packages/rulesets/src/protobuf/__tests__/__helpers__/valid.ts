export const valid = `syntax = "proto3";

package acme.pets.v1;

// A pet.
message Pet {
  string pet_id = 1;
  PetKind kind = 2;
}

// The kind of pet.
enum PetKind {
  PET_KIND_UNSPECIFIED = 0;
  PET_KIND_DOG = 1;
}

// Request for GetPet.
message GetPetRequest {
  string pet_id = 1;
}

// Response for GetPet.
message GetPetResponse {
  Pet pet = 1;
}

// Manages pets.
service PetService {
  // Gets a pet.
  rpc GetPet(GetPetRequest) returns (GetPetResponse);
}
`;
