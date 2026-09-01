#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const REPORT_NAME = "ticket-11-rule-atom-foundation-aggregate-v1-report.json";

const EXPECTED_BASE_REPORTS = 159;
const EXPECTED_BASE_ASSERTIONS = 2036;
const EXPECTED_CURRENT = Object.freeze({
  sliceHash: "0ffaf84c0ace83427c45949c029fb20c3432f220adbefdf94bd9be056edd89ed",
  catalogueHash: "d17e6d39f9c3c7f10afef4185abdccb586e1a7af2657833c492c8f060562e67f",
  runtimeHash: "d6e9fafe69135694c925ac726ff2d7a1dd8523964a7d96a04cb34aa146745ed4",
  relationshipGraphHash:
    "cf8d9aaf3778ca1033f164053b846be372c82bf68d8e81e283a86e1da749f0c6",
  executableRuleAtoms: 695,
  reviewRequiredRuleAtoms: 217,
  displayOnlyRuleAtoms: 114,
  newlyExecutableRuleAtoms: 5,
  strictCompleteAtoms: 695,
  partialContractAtoms: 0,
  noContractAtoms: 0,
  declaredStateContractExecutors: 64,
  stateContractMissingExecutors: 0,
});
const EXPECTED_HISTORICAL_ROUND_PHASE_ACTIVATION_RULES = Object.freeze({
  sliceHash: "03ccbd8f17669859a0dc3692699c79965a9c692e3d91f6481e2fad4d68186128",
  catalogueHash: "131c638a31bd8b04e878e1dc0a128e8bda60fcf88071eb615fcd7a331be1b4a1",
  runtimeHash: "f1f9d2e237917d97415cd7222697d736ef55c1abcacdcc540384f5f03706ebe0",
});
const EXPECTED_HISTORICAL_UNIT_CARD_SUPPLY_RULES = Object.freeze({
  sliceHash: "26a3b14ee8d24a3c0ec6a85581194f902913ce5c9fecf012fb98b867e42f459a",
  catalogueHash: "c3a18341468a9ff2936321fb71fac7105eafb8b31d6899af937a937f24f0208f",
  runtimeHash: "80867a2d2074171b014d08f0bad820a3bfd812d268a5588fda253a474f28b51d",
});
const EXPECTED_HISTORICAL_CARD_BUILD_PAYMENT_RULES = Object.freeze({
  sliceHash: "c1bfa98df9199b722b3a279637934e69146654a429fa18b83a3eceab373cc432",
  catalogueHash: "672759bd456ea330af46131709716b1418d646dd1b9d405a0acce8a7101e4e74",
  runtimeHash: "0d11e5569f1eb6b3e62ac50b1bad9930d30cd7bef8b6db1b4cf39bd2bcf3627d",
});
const EXPECTED_HISTORICAL_ABILITY_TIMING_PRIORITY_RULES = Object.freeze({
  sliceHash: "57476aacab986ace2b95d8feb2f02444a6578f79222202bac93b9ba2c0aed82c",
  catalogueHash: "68c339dac82aed07f09c2e376c0efeb14cd8ae91de064b5c66ab99a7f5f86cf7",
  runtimeHash: "1e3b6ff84b0fbe51f6826b3aceb09028459e969a7d03b3c2bd676e8bba8ee21b",
});
const EXPECTED_HISTORICAL_KEYWORD_SPECIAL_ABILITY_RULES = Object.freeze({
  sliceHash: "5fcfee2fde6d7105d740e5e74ab30349c33e6289cd67d20b5bdcc51a5bcbe28c",
  catalogueHash: "943326ae944165e7c210271e65ddb560f456eb491b45c7533b71047c8752f3ab",
  runtimeHash: "a4fa8535bdc155f645cc1fe1fecf645794c493f7a566500a9543726473067916",
});
const EXPECTED_HISTORICAL_DICE_TEST_MODIFIER_RULES = Object.freeze({
  sliceHash: "ea7f1b10b07f8eee0f312e805bfb20bcf34da73e647f57424a3be3a8ff78b632",
  catalogueHash: "af887ff1952ec3076ef74a087b983ef94c743b119d76d714b255184de3cb1a8f",
  runtimeHash: "81fce5be2083d1c54375f1c358b7c2653b7c62af6226c9dc5808616c8b828df4",
});
const EXPECTED_HISTORICAL_PLAYER_CONTROL_RELATIONSHIP_RULES = Object.freeze({
  sliceHash: "4798bbe5980a5fafda9ffad856f53327f77422833ce302d2a5f00667bd169987",
  catalogueHash: "50135173ca657d69fc62cb779cd1f15275d00b89c883ada59b49cd260b7f4536",
  runtimeHash: "b3e9b3984e81b98da204e8fc75b046c6bd4329c8758a0b4063365213d7cd901f",
});
const EXPECTED_HISTORICAL_MODEL_BASE_GEOMETRY_RULES = Object.freeze({
  sliceHash: "df60e9e77f9aa480c136b6145d454cc23811898488f1f9683bedfffbd40ba328",
  catalogueHash: "e19ea565c2225b90f62bc28a73157140f91dbd505e8a2eda2a5af3b2084c59a0",
  runtimeHash: "d1dcbe60fe654b53d14f2a5f32e0ea6d0b7e8105671e5845ca011956a9f92ddc",
});
const EXPECTED_HISTORICAL_TERRAIN_LOS_RULES = Object.freeze({
  sliceHash: "dfe744261a93f20a260fd36b8c2cfc2989917ca3ef4d3b93d130dac800ef687f",
  catalogueHash: "f3a0170ba9711a4511d7803b1789658c769acf5fef87efbfd92e17b5ab6b438a",
  runtimeHash: "b61a6aacfc7db4ac6670cb08c57d35ead90758fe28c3e559237acfe2b253e324",
});
const EXPECTED_HISTORICAL_ELEVATION_EFFECTIVE_SIZE_RULES = Object.freeze({
  sliceHash: "dc981da46cbae384449dbc9bf3213775a5fbd18a2b016ec4f9fa6a05994eae81",
  catalogueHash: "216398a685146230140a56481dd031dff9f7c9f3f3a650b94165701a9e966e1f",
  runtimeHash: "52229d04183d64ce4fe34e79cf51e4275cc6c905ab4603b057c5c29b08c348e3",
});
const EXPECTED_HISTORICAL_SPECIAL_TERRAIN_RULES = Object.freeze({
  sliceHash: "99454bd06cb660304dd4ae69f9f4753dd4936d402c3d072dcb8744de12d18059",
  catalogueHash: "da040b3e25a9d05e74dfe5af3b7a7baf94627574ede9aa59b171942f023a3622",
  runtimeHash: "f429e97622753e125229d60ce8c45fc7b77a3f542b31166b0a5383b9cd14e016",
});
const EXPECTED_HISTORICAL_TEMPLATE_WEAPON = Object.freeze({
  sliceHash: "77f415c1b6ef8363ecde758d71bd661822ddd9eeedf0156ab7b95e70eee7165b",
  catalogueHash: "5829d562f56df54b0e57a76ae130fba0c41a2ed57de3e93b7c6147839ee986ee",
  runtimeHash: "d21b5fb901e8b50a9f9e327b3968e7d8340473c158a04c8c628f1d93c16e1e17",
});
const EXPECTED_HISTORICAL_ATTACK_POOL_EDGE = Object.freeze({
  sliceHash: "679832d4d10faf9db077d37bc826f29e60c05e5dd878e85a39ba679af4611e34",
  catalogueHash: "6fe9dc881b2fe1eacd0727f4fe2963601866129d4f28009840f37eb23b0220cd",
  runtimeHash: "d41ec7a6957bed16acf24e6132cf18e45a41bf8e8bccde98813b5c892d472013",
});
const EXPECTED_HISTORICAL_CLOSE_COMBAT_LIFECYCLE = Object.freeze({
  sliceHash: "72419eee486fe03bc11e7391cb63d5e7fc7f06ba6e02de1d80ab2487119a4f85",
  catalogueHash: "00108a2738d7b20edd5b9848edb7a080d1d328fab96e072dda477c8a3e05628f",
  runtimeHash: "c860bc9305abbdc615e8d4aab6b6a23ad54624f5effbe42863756f1b911cf270",
});
const EXPECTED_HISTORICAL_DIRECT_MOVEMENT_DISPLACEMENT = Object.freeze({
  sliceHash: "1638c6c7521ad15fe874cf34fcbc4afa01eb2064203c437c64385c1c72935feb",
  catalogueHash: "6383216ec3ff3704ac8ce865f3b135b750dccd367be82f3cb1810c8b74206bcd",
  runtimeHash: "f312f141d77dcb6415aca3f78db455e9fb11e76495b815253f87c18a4af1af11",
});
const EXPECTED_HISTORICAL_GAP_PLACE_GEOMETRY = Object.freeze({
  sliceHash: "aa91a22fb6ce0113e35374d86463e7cf212f46b03b9300b4e3428dd320663165",
  catalogueHash: "05452ecc9cafd3b0bebf9e392dba5f7fda6d07fd1a5e6864666df62a7f25a4d8",
  runtimeHash: "1eedc98e0a0b21ef1a078dadc5ef10b150415bdb410561eb46528d15d9cae979",
});
const EXPECTED_HISTORICAL_FLYING_RULES = Object.freeze({
  sliceHash: "8c465373e5fa35add7f9ad6956d237f4ec0c6ce40d603080b544ca7f0c08dd8d",
  catalogueHash: "ecc5be6b5335ed5ddce9a73146934e6ae721505f35827b8b204caf448803e850",
  runtimeHash: "63ca12125a43107126093177a93eb678dc42a0d710264dc64f351227c7af5f72",
});
const EXPECTED_HISTORICAL_ASSAULT_RUN = Object.freeze({
  sliceHash: "01bde989318c5641849c737f88e4a8635b718068d3da7bb8c2a0c7041bcb7293",
  catalogueHash: "45ab1dfde093421722ba3103b88cca3d869cea5cf0f81bcd5b38a428b5932716",
  runtimeHash: "f5ee9e1257369765fc33979491904eecb5f8dd41e67fedd413c8ff8c8973bad0",
});
const EXPECTED_HISTORICAL_IMPACT = Object.freeze({
  sliceHash: "8bf3fbf687742378962d1942eed19cc80cf769c63e6cbe9c14645fc5d52ba812",
  catalogueHash: "a936ba79c9e3160b31bef967ccf9c9a07e4e222454431b94d63232118fbcb9df",
  runtimeHash: "729f1c8310863f88a5af4a8a1389acbeab1242e2a3bfaddc91350bd355809f27",
});
const EXPECTED_HISTORICAL_MARINE_CHARGE_V2 = Object.freeze({
  sliceHash: "e85b759217d748fd1701441317037a664cdd0bdb348726b9ec9c8904d042af9e",
  catalogueHash: "f64ec51e5c15a34d290bd764cc4f0c9b0f4579b7a03fae505380126781f94aed",
  runtimeHash: "0d794f82236ed4486a7c8405a3eb46775a84299ce36d2d8dc2a7a4b164562161",
});
const EXPECTED_HISTORICAL_STIMPACK_CURRENT_V2_CONTRACT = Object.freeze({
  sliceHash: "0e2be19c977a0bb9c71a66c79bb1876d9d004c15a2fdceb2ebea5136a0b54671",
  catalogueHash: "ae8062993105f2fa421e6495343145151104fafb1c35618d7819e03fc2d1b1a3",
  runtimeHash: "5365803f73cc500f3c39089fdeae592e620cdd980e3c59b38134cb28ea87a33d",
});
const EXPECTED_HISTORICAL_SPECIALIST_V2_CONTRACT = Object.freeze({
  sliceHash: "c2e48a0d54a443abe47f0a29f95ef7d2496b220b4ed6c3542855bb2c6d2364d0",
  catalogueHash: "aaf2e78b1da4677a41b08192a88a2afe03038a1d8f7be15778323fc7578a7ff7",
  runtimeHash: "1ca94b751948b8ae21a46f519177433327b1b18cd1065ef14323b38ffbbaa6e6",
});
const EXPECTED_HISTORICAL_SIDEARM_PINPOINT_V2_CONTRACT = Object.freeze({
  sliceHash: "fb46708820b09e553b29bde671f1bf72c09758b6be398d0b910239bc4e8b98d7",
  catalogueHash: "f23e886978170925d2861a3362c9bc1e0b21904c5072ed154d9d803a81033768",
  runtimeHash: "7a5431f81b5a2917d26d1f8646ab5c9253063d0562ab4b27f7909f0ae4a39b0e",
});
const EXPECTED_HISTORICAL_COMBAT_TAG_SHIELDED_V2_CONTRACT = Object.freeze({
  sliceHash: "4d162039d5d33d453b89cb487e4b0b7372fb2a92e374c821534d3a744165b711",
  catalogueHash: "f6684fd9e57801970677a4885488abba0faaa65b5d0d0b3ffa79794f932a5b08",
  runtimeHash: "fe8427b55b74ebb99bd40ab6517f35ff85e2194040f76e4049c4d8116f673b00",
});
const EXPECTED_HISTORICAL_GOLIATH_SCATTER_V2_CONTRACT = Object.freeze({
  sliceHash: "32597443e0c9e6ef31ea2097f47c01e7d7e98ace48ee341d8d120c833097a54f",
  catalogueHash: "bb6df07837fb7a56a420a541292c41d1b05efb8c37ebf55afa0f34851bfef0d7",
  runtimeHash: "3694d34c2e8c7df4b87cdb9a3dafb6222552f577731b86fa786c24c5a9fb619e",
});
const EXPECTED_HISTORICAL_LIFE_SUPPORT_V2_CONTRACT = Object.freeze({
  sliceHash: "f40b9709b700518a15eebaa5594a8620d7d6fc77ee07ea7c27aa6ac4725d7971",
  catalogueHash: "48f9f27cf603ce6f183e16ee66d4e7cc4b2d0108c4352302ec13eadf6c49a4b7",
  runtimeHash: "fd1c0889ac76848f3d20ebe943f8467e363c0cf6139697ba72046c7968fa05c8",
});
const EXPECTED_HISTORICAL_ACADEMY_MEDIC_V2_CONTRACT = Object.freeze({
  sliceHash: "18d162941b3f83c7efed2e52c4dea1b3ec57854878139ed34e3e55723f77efca",
  catalogueHash: "4043ad65b05c9f5c8742a7bfffeea36404575f58b10d9c5a51081cd06cfcbf8a",
  runtimeHash: "0e94d259842feec3fb872bb01ed3e6ba0729f2c53e572c76c6e30578a81f4e6e",
});
const EXPECTED_HISTORICAL_RANGED_ATTACK_V6_CONTRACT = Object.freeze({
  sliceHash: "17733ad254b5c934673c137966a24e18ddaf7ac679a4754bffb8fb25a2c42c07",
  catalogueHash: "43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b",
  runtimeHash: "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41",
});
const EXPECTED_HISTORICAL_MEDPACK_V2_CONTRACT = Object.freeze({
  sliceHash: "7d0fcef7965258264378de98b0bb1820be94638700b55975fa69ed8a440e210b",
  catalogueHash: "43b6f2f3ff71598e0c797e0e51157ec01cb5b110dbc340f417c1c805b747679b",
  runtimeHash: "dfd340291dc958a0c9600fbe20c6a70a3e0cd21d2a4902f29197c92848280d41",
});
const EXPECTED_HISTORICAL_MOVEMENT_V4_CONTRACT = Object.freeze({
  sliceHash: "4f92a8afde13bf27cbe8a32c3df1cfd1c02d4b1ca1894969a55eb7722c360b35",
  catalogueHash: "d378ecc5f91753d80251dbf37ecdee1c17cdf3a36c001f9855cbb896d588faa9",
  runtimeHash: "51f3d865c2dde8735a8b6f58248d91207d03370b9ac0f0f04a8786c5e7c31241",
});
const EXPECTED_HISTORICAL_MOVEMENT_V3_CONTRACT = Object.freeze({
  sliceHash: "78b19c6ef0e4565eda951d3a7e955834748a1cdb1b886d8fd4041e75a7ce47f3",
  catalogueHash: "f19484a581bf48ad3aa574aea7ae17f636d37af9a8eecbce6d2485d7bbb62d25",
  runtimeHash: "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043",
});
const EXPECTED_HISTORICAL_STANDARD_MOVE_CONTRACT = Object.freeze({
  sliceHash: "0ec04b98321c58eaac23bca4b2383090d666e450876cc4e8b2d9cd61408bddea",
  catalogueHash: "c437d7ef4f9776cbea688f9a082d7d64110d817b763c0092fcdcb25114ed9733",
  runtimeHash: "9df3c61f7b271067ad41b8dabdb228c98341e23fe999c17052eb974d06d61a33",
});
const EXPECTED_HISTORICAL_RESERVE_CONTRACT = Object.freeze({
  sliceHash: "95d7d170e04ea331949f75dc50709c3e7e4da42a166f71a6096794299967f378",
  catalogueHash: "702434b35a0f0af64acd03b706993f02153e1c6c1e4533fa6b65be6f3da7d4e1",
  runtimeHash: "f8cae053d340153b166c12c69e25f719e2b79b6abce78ba05a59f978248bb27c",
});
const EXPECTED_HISTORICAL_START_OF_ROUND = Object.freeze({
  sliceHash: "3a81f7d6c7d5b61fd443d63521a05d20336950f59ae68f0e4839d2dcc89b012b",
  catalogueHash: "70f8a9b7e69c45f788aa3d967417a04898dfeff2855e64760bd5ae397a318529",
  runtimeHash: "b4a63b98baebc6fc74f43356d94b4e61f1456c3c561ef9c771083644a29c1a99",
});
const EXPECTED_HISTORICAL_DETERMINE_INITIATIVE = Object.freeze({
  sliceHash: "54170af6469649848bbacc19743c4ba0952441d8fa510a1892100a58bfb55448",
  catalogueHash: "b380ab76587944fda653ff4ae088c9433a9c7ed3aaaca6182dace07a93eb8a38",
  runtimeHash: "e8b303a317e186721fbf5c5f9b4c53236aeeba95487f29b39ba076254f6fcfb7",
});
const EXPECTED_HISTORICAL_CLEANUP_REFRESH = Object.freeze({
  sliceHash: "23d6385e012107abd6e2ad5b51d05f053d81e5a6833ad4afa09eaee3cc3b5d10",
  catalogueHash: "edda61ad6599cf032caa13476412c1a63897c63babb66000f028019f31cb75e6",
  runtimeHash: "8698853a5f4804ede9da31b8ee1ebf5e51173c5797b10b6ef730874c524aa79d",
});
const EXPECTED_HISTORICAL_END_OF_ROUND_EFFECTS = Object.freeze({
  sliceHash: "4b23af8627bed2e3b8f3820e84dea2c0ab710d2085e2a16defbe84584a6da014",
  catalogueHash: "47f128f34764e9c6a15193dfe1a99906290ea5073da8033d1a7296e8e8d67dd9",
  runtimeHash: "ec37637bc787d6d5870db5c02fa84f53b077d54f177542bd8282b710f42eb089",
});
const EXPECTED_HISTORICAL_HOLD_POSITION_END_GAME = Object.freeze({
  sliceHash: "d74733ad2a030e7e2b5ab7aabcd05f9af5a4129102b8cf951640876972835b21",
  catalogueHash: "87cd066376e8ab637ee5083711e11e3dfc8e491d47745baf9706cc4f9771b181",
  runtimeHash: "ecb2e9001d8a8f42cf45adb695bfc977dc79889fa8a6aacda258951b90d9cf64",
});
const EXPECTED_HISTORICAL_VICTORY_POINT = Object.freeze({
  sliceHash: "d29118ef53324b6c15f9b61d048db20f79ad3e0a82a9239941ddfdd87dcaba2c",
  catalogueHash: "23512e7eccf02f31a11c418663a8b68aa13744c30561f3c3fb37b086c22b2a5a",
  runtimeHash: "d29dc21552c919c9da004368ef79324c97d311d1f4321880dd7f5e2692f2bcfe",
});
const EXPECTED_HISTORICAL_MISSION_MARKER = Object.freeze({
  sliceHash: "fdb44c36f5c418954b0524a3943cccf09fe3bc44b3e34e0533be9b73235d6662",
  catalogueHash: "d7ebb1f60f861544a31711362077927dde00271faf91e44350b5000ed06ff908",
  runtimeHash: "7ba03eba7f2ea2f357c5264bcc2f261453a0f3b3c0fc9310db3c281a2eac8f55",
});
const EXPECTED_HISTORICAL_COMBAT_PASS = Object.freeze({
  sliceHash: "e87649721f78720ced43ea3792dcbcd7514a4fe187c63222ecac1ba1eacca90f",
  catalogueHash: "eea6d9c0395db9e442f9606b3a9c97196aa949b7a0e29c69590c5717b246922d",
  runtimeHash: "1d6b06dd12b6eae1c0471d9a5a38073c316a4835018f0c8fc47112344226e26c",
});
const EXPECTED_HISTORICAL_ASSAULT_HOLD = Object.freeze({
  sliceHash: "8afa8a3085562d61adda4469ef1e160a363828e6a6f9d9bcb561e4921dc6e404",
  catalogueHash: "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  runtimeHash: "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
});
const EXPECTED_HISTORICAL_MOVEMENT_HOLD = Object.freeze({
  sliceHash: "cc1b7bc338f60c59af0c3644f5a2d2dfeea7494c706972871e3d6b15c21d8458",
  catalogueHash: "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  runtimeHash: "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
});
const EXPECTED_HISTORICAL_ACTIVATION_PASS = Object.freeze({
  sliceHash: "d6e892447b54b2e95f689ba822ec935faff7bc30c1fb8aa87b6092515839a69c",
  catalogueHash: "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  runtimeHash: "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
});
const EXPECTED_HISTORICAL_EXISTING_CONTRACT = Object.freeze({
  sliceHash: "3dd146a3d76b8c73a3c8807e709b1526a28bc74074a117dcc863f36442216bff",
  catalogueHash: "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  runtimeHash: "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
});
const EXPECTED_HISTORICAL_MULTI_ENEMY_STIMPACK = Object.freeze({
  sliceHash: "03daff75c35c1686074cec94a070554385d3f2a27ad55aa9c696305ad0179b45",
  catalogueHash: "cf0c60b4faa04674727273cadc8fa1fbca158cabce3d85825d0417928abb0d7e",
  runtimeHash: "3a9684030e8020bffbcac80c6238804f673c98b695b49286481662fc5e01749a",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_MULTI_ENEMY_CASUALTY = Object.freeze({
  sliceHash: "69452cbf2adbf5c067f6996c09f748ac739bd0c606a0226c01b1184e13ed4211",
  catalogueHash: "98312255b197471e93b8b9b0a141b694743bcbef880830b7bdb4bf60736a0cf3",
  runtimeHash: "dfa25995e03e98ddd5b1fab855dcc9744312b2599ca3452e4364ab2db34d79d6",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_MULTI_MODEL_CASUALTY = Object.freeze({
  sliceHash: "a52b9b24bcdc8d2626949b2927238bf4ee9f3b9cff9a8d55494d1b6390012778",
  catalogueHash: "cebc6dfffb91c73557ae23c33eea3d0bf54a79017d583a2d98348c99e95b2fac",
  runtimeHash: "e115118c04d60794ccc0372972e98b7c6c4e1fe0d9012676c0a1408ae2e02cb7",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_MULTI_MODEL_STIMPACK_CLOSE_COMBAT = Object.freeze({
  sliceHash: "2d6214ab7962db7d89a96af8ef3fba8484cafa2956e3430b81c0a1a5539b2454",
  catalogueHash: "89f9cd56e8eaaa416557cd993f467daf332533d7582c66f5452078899dcc7e6b",
  runtimeHash: "5f0aac1f49280b9c263c8744d74427b967aa81283a5d17b5357320266930b441",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_MULTI_MODEL_DENOMINATOR = Object.freeze({
  sliceHash: "0a5c8cc51b1369b13666aa1efbe1ccbe056c4b457f980979036b8833468e60ab",
  catalogueHash: "732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649",
  runtimeHash: "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_STIMPACK_CLOSE_COMBAT = Object.freeze({
  sliceHash: "e722cc2e5335e26442fb27c2e068c1ca6dcbf97fbbfbab977dd7832c83c9a3a6",
  catalogueHash: "732fad40374c25f9acd60e35cbf17ba1e91a39efc49f226b440f992b5635a649",
  runtimeHash: "7cdcaa4c9b7fc12c2825d154790cfe333ed99ca4da1df0e9abc8963b5c4f9acc",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_RELATIONSHIP = Object.freeze({
  sliceHash: "910f289b54b73dfcd5b69b52a6d9ad500af68a4e531d311fa3c9d5b0a456fd23",
  catalogueHash: "7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede",
  runtimeHash: "6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_OPTIONAL_STIMPACK_MOVE = Object.freeze({
  sliceHash: "b9e6fc60ba92f75dc1b0467e9599c2b392dfb28da1b07f23a4ece794f4fa3434",
  catalogueHash: "7a20c8408082facb6d3c4255d6930fac946477c8ae78cd1d33b507e6577b9ede",
  runtimeHash: "6f025a2f0b60c8f36a20f1131eb6401ab7a9ae40ad5db6049bab187b9638bc4c",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_STIMPACK_MOVE = Object.freeze({
  sliceHash: "e02af2917e9100144242c26d5410251742d84d508b01d639401cbc720c2ab5e7",
  catalogueHash: "d3edd16def3f9ba7a5035800ff1285233cece3144c047ff74ad3e79f56f96712",
  runtimeHash: "6206a3058aec4ec9750a27465b5c203049b50a9cb7bafb7763be39810a3ece86",
  executableRuleAtomCount: 421,
});
const EXPECTED_HISTORICAL_MARINE_STIMPACK = Object.freeze({
  sliceHash: "7ae981afe360688f6974a734a938d3bbecd8e68a83acebc394f4995851953322",
  catalogueHash: "f11ffcd0a8e07bb6fb9be6498fc69b31575ff3176ab7daa55c0ad92bf2f9d2d9",
  runtimeHash: "d7ae88eb24d20313aebca63a2c43a6a2ae4c5f000ff92a896864f10710fe89fe",
  executableRuleAtomCount: 420,
});
const EXPECTED_HISTORICAL_LIFE_SUPPORT = Object.freeze({
  sliceHash: "f54e29d1156331539b8cbb3cbda9517d9b56785acbbe598ef48428bd01154aed",
  catalogueHash: "bccab94b7e9d1979581125acedefa3d28e8707756ac4c5a5a09198c3df5abe0e",
  runtimeHash: "4a7344b351459dabcd05649efdaf8d4f7a69abd76e2cca534c9568e315c09eb5",
  executableRuleAtomCount: 414,
});
const EXPECTED_HISTORICAL_RESTORATION_RANGE = Object.freeze({
  sliceHash: "a7857e66c575afe7943202e862f0555054f2cdcb02bddd4a864746ea0e153384",
  catalogueHash: "9f7169d25eface1913c8cfbe6fca8d1557c8e20efe2ae213442e9905348c864a",
  runtimeHash: "4260abf38957d9bbcb307171a346d35408778c446905306eefc8404de76edda4",
  executableRuleAtomCount: 407,
});
const EXPECTED_HISTORICAL_ACADEMY_OPTICAL_FLARE = Object.freeze({
  sliceHash: "9e1fef200fda7faaac81faca0a945be7470e5f91ad56a7e95c526306a611e26e",
  catalogueHash: "3900f94952042d1b9fa44b7147fee81ac138079d0c7ae28021e14c05113a8a57",
  runtimeHash: "27437fb6976ce3d4ead8b2257123f3d61d320e6a52c87bcb165b17add1238673",
  executableRuleAtomCount: 403,
});
const EXPECTED_HISTORICAL_MEDIC_MEDPACK = Object.freeze({
  sliceHash: "5ab56efe43938ac9458310be15886309218485f5e551dfdde734b9bf8f2871ec",
  catalogueHash: "49edf13886590b2539669a5881bab442113166e29edb5e0194d6197f850f2049",
  runtimeHash: "acead33c1486645a149466848b7d276c54c99c51261c641786e9633dafde815d",
  executableRuleAtomCount: 394,
});
const EXPECTED_HISTORICAL_COMBAT_TAG_SHIELDED = Object.freeze({
  sliceHash: "7264c7cf282dfd74416662f9735ba552559a8e4ef503e428f66f6f442fc4cc4c",
  catalogueHash: "43f0064e299b6b03fc99111cfe4dc2ec132cc52ee06bc09f7b9b1dff86ad4b4b",
  runtimeHash: "4c72c2953a71db039e0391c2643a2228ba36cfd727cf1b105b6ffacdae20ca93",
  executableRuleAtomCount: 365,
});
const EXPECTED_HISTORICAL_INDIRECT_LOCKED = Object.freeze({
  sliceHash: "c3e818e93def152d406a6a5171bb5d588029009e46372a78e925030974522767",
  catalogueHash: "4f97e3b354cdf0a47f9b72083379fa2111a19193900eec401358ef3b801aab7f",
  runtimeHash: "a6f1264ecee7adb0ce99d2ff8357d137bc44c14031c2663ed6e1609d31037258",
  executableRuleAtomCount: 355,
});
const EXPECTED_HISTORICAL_SIDEARM_PINPOINT = Object.freeze({
  sliceHash: "6bdaab04298bd7d3345ccc35161f1d2230c778a08ce91fa789d77281813a89dc",
  catalogueHash: "95b9bb51ca3dc18c03367ff789976fa64f8453be9cfe4db0cfa652876582d023",
  runtimeHash: "ad6ede455d3da1ad0532361d96810325934025ab3ba2ee31f77f7438dc5bc794",
  executableRuleAtomCount: 343,
});
const EXPECTED_HISTORICAL_SPECIALIST_RANGED_BATCH = Object.freeze({
  sliceHash: "20b4f2b66597a347e6b7213d8c4fc1c6a3ad59ad136b3c36713925e79ceb4121",
  catalogueHash: "1889bb7d9f2c5f0b7013a056db8fc50f9ef4c2150a4df5204e3b38e54a1c182c",
  runtimeHash: "888b4340397e9b504444b0d8094c75b13bb04f50f3766ce325911a5bd893735d",
  executableRuleAtomCount: 337,
});
const EXPECTED_HISTORICAL_SPECIALIST_LOADOUT = Object.freeze({
  sliceHash: "08b75feed79463b757da0e6641ac2e44d120746147b0273eef73cd903732c639",
  catalogueHash: "88c0a7ed430cb703b49e2c993b13e13b8f1769a070f5420b1db08269472b7366",
  runtimeHash: "fdba261a92b50f35d37b15c727141ff615833dfff0a559993ea1db85f85ee54a",
  executableRuleAtomCount: 331,
});
const EXPECTED_HISTORICAL_CLOSE_V8 = Object.freeze({
  sliceHash: "b1fc80fc4c3b74e045f961e5b2279eb8a6fead74ca0ca2c947c3185a532921c8",
  catalogueHash: "e289a3b7120eaed2bb282a1f261607300c2f15441b42f81a2c468a77cd078476",
  runtimeHash: "28dd32c0b27bda8573171b4ed7008bebde9f919bf954688d0fe30d7f154915fc",
  executableRuleAtomCount: 327,
});
const EXPECTED_HISTORICAL_CLOSE_V7 = Object.freeze({
  sliceHash: "985f244a9dafdab218e15e627503bf5feaee8626d7de212bc3d4550a6366e482",
  catalogueHash: "6f32870d70cd485a12b042de5867bb5211f12e4b2d808e360e3e5cf6760e12e3",
  runtimeHash: "ba856551aaaea63defab390930ff37cbcca97aea68d02d916b9b276e4d696f5d",
  executableRuleAtomCount: 326,
});
const EXPECTED_HISTORICAL_CLOSE_V6 = Object.freeze({
  sliceHash: "bac947b8ca453de6dcfbfcc91ac77deef84625e30f66a476b491e38e3bc7515b",
  catalogueHash: "64a9b9a717ccbbd69384a07aaeb39e56df0849a304094de92075d6177f5bde6c",
  runtimeHash: "ee255eee5aa16cdccb2ef2ce3ea3b49ae190862419e76a061e0824e7c3405eb6",
  executableRuleAtomCount: 306,
});
const EXPECTED_HISTORICAL_RANGED_V6 = Object.freeze({
  sliceHash: "56589aa766e66ee68578c8b1c74d21814b5f04e19f75cdcdedbda0b22183ef55",
  catalogueHash: "21927d9dcd022212d96f974249fba99e618076914076ed6b02e5046245989b3a",
  runtimeHash: "17c91887a32c1e8b76aeafbea5f65c7ac2f5b0f4234caf7b468521621f012562",
  executableRuleAtomCount: 305,
});
const EXPECTED_HISTORICAL_RANGED_V5 = Object.freeze({
  sliceHash: "44cdf6abfe325d8934e999a9b78e20732b17148da3b81500b6d10e6b1f574a0b",
  catalogueHash: "e6d616c079b627d80a626bb747bd37d8c5fa807e3db8fd2c3bf0d0af6389cb22",
  runtimeHash: "36aa2c6d931f3002fb5ca2651f727da6f47b348b186b4edbfdb64b7fd6dbd388",
  executableRuleAtomCount: 304,
});
const EXPECTED_HISTORICAL_RANGED_V4 = Object.freeze({
  sliceHash: "3130b7296d77172c68b50f10cc379e68fa76be1ebf769d87d6fac3f5f03b2fd8",
  catalogueHash: "3a558f8e377ff0616d59369e326a2ff052a67c0c5d5191a51015a31b369dfd77",
  runtimeHash: "99510a4d31ccfe8f84f7ec97df35c85d758111a2fed283cd6bcd51c79f0c7683",
  executableRuleAtomCount: 299,
});
const EXPECTED_HISTORICAL_RANGED_V3 = Object.freeze({
  sliceHash: "0d68450f701457621daeaa58443befc917887e5ed71678f76193f3275c394a29",
  catalogueHash: "72fc2527650f54b66e8c5faf4991a23eab97acbd5d9aea8bc0283ef7e867a669",
  runtimeHash: "bdb88261239e1041b30a27ff556046f5648399f411c98dd965e22b17e506b19a",
  executableRuleAtomCount: 283,
});
const EXPECTED_HISTORICAL_RANGED_V2 = Object.freeze({
  sliceHash: "28089a92a62a280b0b33c49dac057b27344f53a35088f04bfdfd0395a10506a8",
  catalogueHash: "40de23f202c992ef324dc68a22369cf4f7e09a34c7e18d46703199b93e544e5a",
  runtimeHash: "dd3f3bc9e8832a47069ee75aa1c258072d55d2797b36bd429288c265b1b6cf5f",
  executableRuleAtomCount: 282,
});
const EXPECTED_HISTORICAL_RANGED = Object.freeze({
  sliceHash: "08d813bd5437b4dbe33dbd3b32873889af18b282b218092f0a218c515bc31be7",
  catalogueHash: "735f437bfd501f9940730e8782eb4afd9110346fb33ac7bf4e8a6654146e134b",
  runtimeHash: "01ed2a06eb361059f598f5e60cab0791065acc7409c60ef6cf333f50d5f54b79",
  executableRuleAtomCount: 278,
});
const EXPECTED_HISTORICAL_DISENGAGE_CASUALTY = Object.freeze({
  sliceHash: "88ff14e5fec6226472c3aefb64cf9d0921086595d5d6c28dc22e462abd255f86",
  catalogueHash: "d73e76d759de31b7f008f4ccdfb28c152f8c66bfafd4f858a99b0329f02efe6f",
  runtimeHash: "e94bd5d6ef839fb96c1077da532c5d4314c1c0d7c60754523a410613aaea4541",
  executableRuleAtomCount: 239,
});
const EXPECTED_HISTORICAL_DISENGAGE = Object.freeze({
  sliceHash: "b323a7bd016cf4eb9452b94dbe8db7d3264c797138b8c888e026ec35a354e67f",
  catalogueHash: "908bba33a920c88ddff5b42a88d82f96f9583b05176ec8bff755a293fff6bb3b",
  runtimeHash: "92b5d5f6c7d56e03ffdf3728712ddd98cfb1a956256e31e76ce32c6dc4a0dbe5",
  executableRuleAtomCount: 237,
});
const EXPECTED_HISTORICAL_STANDARD = Object.freeze({
  sliceHash: "bf5bfc6b33fb1904e62de4f82b35af8499af10413e02b7b0191b175d96d5b123",
  catalogueHash: "66580f1a4b5667f04cb0ead346e5bb7c01c11376b7ccfb7bc7af8edd1f6aa4d5",
  runtimeHash: "a8f0facd1234cd20ba863c47fb7885eb2c816c1cb33b4142d41484e28b19eb80",
  executableRuleAtomCount: 229,
});
const EXPECTED_HISTORICAL_RESERVE = Object.freeze({
  sliceHash: "8d0b4d5f610c98be893368582b1a524ac80ac28336af5c621f299a3b3b3ffdd4",
  catalogueHash: "8211038e76d2778b984fae7f4f993d47a234459ef6cf1c0bbfc5ee75754adf5e",
  runtimeHash: "4b28cfd12fa388f3e8f7fa32547814ec2ad1cbb8205c4d547977eb9049e247a6",
  executableRuleAtomCount: 219,
});
const EXPECTED_HISTORICAL_START = Object.freeze({
  sliceHash: "8ba3a8dc661c240b1ce1a65392f5b3d809e3067a5b7dee1ca39be82f076f9b5d",
  catalogueHash: "2fbc564066e63be0130cd95452fe9f0fddd0950f0aba1cce082478ebbb3d8fd4",
  runtimeHash: "454d0a289d536b9d75e11f393a37386a2bffff05563fd371f49ccbd7a0f14be0",
  executableRuleAtomCount: 189,
});
const EXPECTED_HISTORICAL_DETERMINE = Object.freeze({
  sliceHash: "366e4c0de93a9f40f0523f1d55c8c3278f7c71462f49a74154a75b09901a4483",
  catalogueHash: "dfa0f15672ea9a7742f3618738a7ed4577bba47d6c8e7c8613ec9ff607b11267",
  runtimeHash: "7edeb5f2b688a4e12e37241469a47b6f3fa1ee13bcaf029631452ef8c962d558",
  executableRuleAtomCount: 176,
});
const EXPECTED_HISTORICAL_CLEANUP = Object.freeze({
  sliceHash: "4a77ae00c60365baa348bd6bad88087ffa999de60a094750bd212f644a6f76a0",
  catalogueHash: "99c331381cbfbaf75730f93670485ad23f873b9a643d8f6146282d84b726e4be",
  runtimeHash: "3bed86bac0c0f521f719171bda1d6b4b5933ba5187750d8552d885848a471ef4",
  executableRuleAtomCount: 170,
});
const EXPECTED_HISTORICAL_EOR = Object.freeze({
  sliceHash: "9e5609659d0f51d1dd696ce56f746b6ae27e5aaa4ab7cb01a12635f69b8d78de",
  catalogueHash: "0a697bcbc01cea1f3bd44ea1be06a33e8c4103f4c7a05e4d3ebf2b3d6da42e9c",
  runtimeHash: "a331acde4d25a2a121f6b0707e6a34828370c768510487fdcfc40b47e872a85f",
  executableRuleAtomCount: 166,
});
const EXPECTED_HISTORICAL_END_GAME = Object.freeze({
  sliceHash: "fa488e3cf26cd88fa8a7c47402141868feb5429833f93848a2f9cc367b88f51a",
  catalogueHash: "b6d22dc9a2bb0f8f8c377ba3368744760c0e686a73f0103f5dd3270694439c3c",
  runtimeHash: "58fac9defcb7639eba2e8822c6a284d593c3c5e88275d94d17298fb265a15b71",
  executableRuleAtomCount: 164,
});
const EXPECTED_HISTORICAL_SCORING = Object.freeze({
  sliceHash: "5a0e912234f656bcf51f8c9b9bd28b56c21faaf0298fb3256225b41911828cc2",
  catalogueHash: "f831bab25b4a82c1ae56ce90a5c2e964616696b8c34df2ea828d5f4539a8df38",
  runtimeHash: "61a688b603947d9f3e6b913caf8b973dbf28da1e012b033c1aaa5b2a8adf4039",
  executableRuleAtomCount: 162,
});
const EXPECTED_HISTORICAL_MARKER = Object.freeze({
  sliceHash: "2d1b8e4d71ee21b2465da36a2a6059fa18ba740d0dbba935eea6b53b43bd102e",
  catalogueHash: "9a841f18e820ae4f76908c5c4f5d471d4494c93bf4da39cecec056e235fc0217",
  runtimeHash: "df44882962d38370829e4c72a4da6ec9e6d2e1f33b84bde12a581f0192e2ef1d",
  executableRuleAtomCount: 150,
});
const EXPECTED_HISTORICAL_V4 = Object.freeze({
  catalogueHash: "db2e3de5a481a3eea05e6fb177475f062f937937fae67252d34573f8d762ee70",
  runtimeHash: "a526844692ee0959e9df7a65e3ad27294c856b5815c9b980c8e7e040f070dd5f",
  executableRuleAtomCount: 128,
});
const EXPECTED_OFFICIAL_BASELINE = Object.freeze({
  sourceSnapshotHash: "c737db613fbba1c917348c98f00e1cb856650ae9bbbaec1093145fe0fae62a61",
  datasetHash: "38f89f3a383555627d131dc11fbba53f5b6918b604d25eaa87198df00a1a8e63",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const EXPECTED_OFFICIAL = Object.freeze({
  sourceSnapshotHash: "243ecbae04073569ccd9b0cb091ab72ac566da5b0ff0fc81a25a84baee70571c",
  datasetHash: "225c4628b281fbc05af88b601989ee84789ae6945dbecb7c80edb2d3ce442021",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const EXPECTED_OFFICIAL_LATEST = Object.freeze({
  sourceSnapshotHash: "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78",
  datasetHash: "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a",
  dataVersions: Object.freeze({ cardsVersion: "69", rulesVersion: "48", unitsVersion: "71" }),
});
const EXPECTED_EXECUTORS = Object.freeze([
  "authority.ability-timing-priority-rules-v1@1.0.0",
  "authority.academy-medic-ability-v2@2.0.0",
  "authority.activation-pass-v1@1.0.0",
  "authority.assault-hold-v2@2.0.0",
  "authority.assault-run-v1@1.0.0",
  "authority.attack-pool-edge-v1@1.0.0",
  "authority.card-build-payment-rules-v1@1.0.0",
  "authority.cleanup-refresh-v2@2.0.0",
  "authority.cleanup-refresh-v3@3.0.0",
  "authority.cleanup-refresh-v5@5.0.0",
  "authority.close-combat-attack-v8@8.0.0",
  "authority.close-combat-lifecycle-v1@1.0.0",
  "authority.combat-pass-v3@3.0.0",
  "authority.combat-tag-shielded-ranged-v2@2.0.0",
  "authority.determine-initiative-v2@2.0.0",
  "authority.dice-test-modifier-rules-v1@1.0.0",
  "authority.direct-movement-displacement-v1@1.0.0",
  "authority.disengage-v5@5.0.0",
  "authority.elevation-effective-size-rules-v1@1.0.0",
  "authority.end-of-round-effects-v2@2.0.0",
  "authority.end-of-round-effects-v3@3.0.0",
  "authority.end-of-round-effects-v5@5.0.0",
  "authority.flying-rules-v1@1.0.0",
  "authority.gap-place-geometry-v1@1.0.0",
  "authority.goliath-charge-v1@1.0.0",
  "authority.goliath-scatter-ranged-batch-v2@2.0.0",
  "authority.hold-position-end-game-check-v2@2.0.0",
  "authority.impact-v1@1.0.0",
  "authority.keyword-special-ability-rules-v1@1.0.0",
  "authority.marine-charge-v2@2.0.0",
  "authority.marine-multi-enemy-casualty-close-combat-v4@4.0.0",
  "authority.marine-multi-enemy-stimpack-casualty-close-combat-v5@5.0.0",
  "authority.marine-multi-model-casualty-close-combat-v3@3.0.0",
  "authority.marine-multi-model-stimpack-active-v3@3.0.0",
  "authority.marine-multi-model-stimpack-close-combat-v2@2.0.0",
  "authority.marine-optional-stimpack-move-v2@2.0.0",
  "authority.marine-stimpack-active-v2@2.0.0",
  "authority.marine-stimpack-active-v3@3.0.0",
  "authority.medic-life-support-reaction-v2@2.0.0",
  "authority.medic-medpack-active-v2@2.0.0",
  "authority.medic-restoration-reaction-v2@2.0.0",
  "authority.mission-marker-control-v3@3.0.0",
  "authority.model-base-geometry-rules-v1@1.0.0",
  "authority.movement-hold-v1@1.0.0",
  "authority.optical-flare-ranged-consumer-v2@2.0.0",
  "authority.phase-initiative-v1@1.0.0",
  "authority.player-control-relationship-rules-v1@1.0.0",
  "authority.ranged-attack-v6@6.0.0",
  "authority.reserve-deploy-v5@5.0.0",
  "authority.round-phase-activation-rules-v1@1.0.0",
  "authority.sidearm-pinpoint-ranged-batch-v2@2.0.0",
  "authority.special-terrain-rules-v1@1.0.0",
  "authority.specialist-loadout-v2@2.0.0",
  "authority.specialist-ranged-batch-v2@2.0.0",
  "authority.standard-move-v5@5.0.0",
  "authority.start-of-round-v5@5.0.0",
  "authority.stimpack-close-combat-consumer-v1@1.0.0",
  "authority.stimpack-move-consumer-v3@3.0.0",
  "authority.stimpack-ranged-consumer-v2@2.0.0",
  "authority.supply-pool-rules-v1@1.0.0",
  "authority.template-weapon-v1@1.0.0",
  "authority.terrain-los-rules-v1@1.0.0",
  "authority.unit-card-supply-rules-v1@1.0.0",
  "authority.victory-point-scoring-v2@2.0.0",
]);

async function loadReport(name) {
  return JSON.parse(await readFile(path.join(OUTPUT_DIR, name), "utf8"));
}

const reportNames = (await readdir(OUTPUT_DIR))
  .filter((name) => name.endsWith(".json") && name.includes("report") && name !== REPORT_NAME)
  .sort();
const reports = await Promise.all(reportNames.map(async (name) => ({
  name,
  report: await loadReport(name),
})));
const byName = new Map(reports.map((entry) => [entry.name, entry.report]));
const mission = byName.get("official-mission-marker-control-rule-slice-v1-report.json");
const scoring = byName.get("official-victory-point-scoring-rule-slice-v1-report.json");
const endGame = byName.get("official-hold-position-end-game-rule-slice-v1-report.json");
const endOfRound = byName.get("official-end-of-round-effects-rule-slice-v1-report.json");
const cleanup = byName.get("official-cleanup-refresh-rule-slice-v1-report.json");
const determine = byName.get("official-determine-initiative-rule-slice-v1-report.json");
const startOfRound = byName.get("official-start-of-round-rule-slice-v1-report.json");
const reserve = byName.get("official-reserve-deploy-rule-slice-v1-report.json");
const standardMove = byName.get("official-standard-move-rule-slice-v1-report.json");
const disengage = byName.get("official-disengage-rule-slice-v1-report.json");
const disengageCasualty = byName.get("official-disengage-casualty-rule-slice-v1-report.json");
const historicalRanged = byName.get("official-ranged-attack-rule-slice-v1-report.json");
const historicalRangedV2 = byName.get("official-ranged-attack-rule-slice-v2-report.json");
const historicalRangedV3 = byName.get("official-ranged-attack-rule-slice-v3-report.json");
const historicalRangedV4 = byName.get("official-ranged-attack-rule-slice-v4-report.json");
const historicalRangedV5 = byName.get("official-ranged-attack-rule-slice-v5-report.json");
const historicalRangedV6 = byName.get("official-ranged-attack-rule-slice-v6-report.json");
const historicalCloseV6 = byName.get("official-close-combat-attack-rule-slice-v6-report.json");
const historicalCloseV7 = byName.get("official-close-combat-attack-rule-slice-v7-report.json");
const historicalCloseV8 = byName.get("official-close-combat-attack-rule-slice-v8-report.json");
const historicalSpecialistLoadout = byName.get("official-specialist-loadout-rule-slice-v1-report.json");
const historicalSpecialistRangedBatch = byName.get(
  "official-specialist-ranged-batch-rule-slice-v1-report.json",
);
const historicalSidearmPinpoint = byName.get(
  "official-sidearm-pinpoint-rule-slice-v1-report.json",
);
const historicalIndirectLocked = byName.get(
  "official-indirect-fire-locked-in-rule-slice-v1-report.json",
);
const historicalCombatTagShielded = byName.get(
  "official-combat-tag-shielded-rule-slice-v1-report.json",
);
const historicalMedicMedpack = byName.get("official-medic-medpack-rule-slice-v1-report.json");
const historicalAcademyOpticalFlare = byName.get(
  "official-academy-optical-flare-rule-slice-v1-report.json",
);
const historicalRestorationRange = byName.get(
  "official-restoration-range-consumer-rule-slice-v1-report.json",
);
const historicalLifeSupport = byName.get(
  "official-life-support-damage-reaction-rule-slice-v1-report.json",
);
const historicalMarineStimpack = byName.get("official-marine-stimpack-rule-slice-v1-report.json");
const historicalStimpackMove = byName.get(
  "official-stimpack-speed-move-rule-slice-v1-report.json",
);
const historicalOptionalStimpackMove = byName.get(
  "official-marine-optional-stimpack-move-rule-slice-v2-report.json",
);
const historicalRelationship = byName.get("official-rule-relationship-rule-slice-v1-report.json");
const historicalStimpackCloseCombat = byName.get(
  "official-stimpack-close-combat-rule-slice-v1-report.json",
);
const historicalMultiModelDenominator = byName.get(
  "official-marine-multi-model-close-combat-denominator-v1-report.json",
);
const historicalMultiModelStimpackCloseCombat = byName.get(
  "official-marine-multi-model-stimpack-close-combat-v2-report.json",
);
const historicalMultiModelCasualty = byName.get(
  "official-marine-multi-model-casualty-v3-report.json",
);
const historicalMultiEnemyCasualty = byName.get(
  "official-marine-multi-enemy-casualty-v4-report.json",
);
const historicalMultiEnemyStimpack = byName.get(
  "official-marine-multi-enemy-stimpack-casualty-v5-report.json",
);
const historicalExistingContract = byName.get(
  "official-existing-executor-contract-closure-v1-report.json",
);
const historicalActivationPass = byName.get(
  "official-existing-activation-pass-contract-closure-v1-report.json",
);
const historicalMovementHold = byName.get(
  "official-existing-movement-hold-contract-closure-v1-report.json",
);
const historicalAssaultHold = byName.get(
  "official-existing-assault-hold-contract-closure-v1-report.json",
);
const historicalCombatPass = byName.get(
  "official-existing-combat-pass-contract-closure-v1-report.json",
);
const historicalMissionMarker = byName.get(
  "official-existing-mission-marker-control-contract-closure-v1-report.json",
);
const historicalVictoryPoint = byName.get(
  "official-existing-victory-point-scoring-contract-closure-v1-report.json",
);
const historicalHoldPositionEndGame = byName.get(
  "official-existing-hold-position-end-game-contract-closure-v1-report.json",
);
const historicalEndOfRoundEffects = byName.get(
  "official-existing-end-of-round-effects-contract-closure-v1-report.json",
);
const historicalCleanupRefresh = byName.get(
  "official-existing-cleanup-refresh-contract-closure-v1-report.json",
);
const historicalDetermineInitiative = byName.get(
  "official-existing-determine-initiative-contract-closure-v1-report.json",
);
const historicalStartOfRound = byName.get(
  "official-existing-start-of-round-contract-closure-v1-report.json",
);
const historicalReserveContract = byName.get(
  "official-existing-reserve-deploy-contract-closure-v1-report.json",
);
const historicalStandardMoveContract = byName.get(
  "official-existing-standard-move-contract-closure-v1-report.json",
);
const historicalMovementV3Contract = byName.get(
  "official-existing-movement-v3-contract-closure-v1-report.json",
);
const historicalMovementV4Contract = byName.get(
  "official-existing-stimpack-move-v2-contract-closure-v1-report.json",
);
const historicalMedicMedpackV2Contract = byName.get(
  "official-existing-medic-medpack-v2-contract-closure-v1-report.json",
);
const historicalRangedAttackV6Contract = byName.get(
  "official-existing-ranged-attack-v6-contract-closure-v1-report.json",
);
const historicalAcademyMedicV2Contract = byName.get(
  "official-existing-academy-medic-v2-contract-closure-v1-report.json",
);
const historicalLifeSupportV2Contract = byName.get(
  "official-existing-life-support-v2-contract-closure-v1-report.json",
);
const historicalGoliathScatterV2Contract = byName.get(
  "official-existing-goliath-scatter-v2-contract-closure-v1-report.json",
);
const historicalCombatTagShieldedV2Contract = byName.get(
  "official-existing-combat-tag-shielded-v2-contract-closure-v1-report.json",
);
const historicalSpecialistV2Contract = byName.get(
  "official-existing-specialist-v2-contract-closure-v1-report.json",
);
const historicalStimpackCurrentV2Contract = byName.get(
  "official-existing-stimpack-current-v2-contract-closure-v1-report.json",
);
const historicalMarineChargeV2 = byName.get(
  "official-marine-charge-v2-rule-slice-v1-report.json",
);
const historicalImpact = byName.get("official-impact-after-charge-rule-slice-v1-report.json");
const historicalAssaultRun = byName.get("official-assault-run-rule-slice-v1-report.json");
const historicalTemplateWeapon = byName.get("official-template-weapon-rule-slice-v1-report.json");
const historicalAttackPoolEdge = byName.get(
  "official-attack-pool-edge-rule-slice-v1-report.json",
);
const historicalCloseCombatLifecycle = byName.get(
  "official-close-combat-lifecycle-rule-slice-v1-report.json",
);
const historicalDirectMovementDisplacement = byName.get(
  "official-direct-movement-displacement-rule-slice-v1-report.json",
);
const historicalGapPlaceGeometry = byName.get(
  "official-gap-place-geometry-rule-slice-v1-report.json",
);
const historicalFlyingRules = byName.get(
  "official-flying-rules-rule-slice-v1-report.json",
);
const historicalTerrainLosRules = byName.get(
  "official-terrain-los-rules-rule-slice-v1-report.json",
);
const historicalElevationEffectiveSizeRules = byName.get(
  "official-elevation-effective-size-rules-rule-slice-v1-report.json",
);
const historicalSpecialTerrainRules = byName.get(
  "official-special-terrain-rules-rule-slice-v1-report.json",
);
const historicalModelBaseGeometryRules = byName.get(
  "official-model-base-geometry-rules-rule-slice-v1-report.json",
);
const historicalPlayerControlRelationshipRules = byName.get(
  "official-player-control-relationship-rules-rule-slice-v1-report.json",
);
const historicalDiceTestModifierRules = byName.get(
  "official-dice-test-modifier-rules-rule-slice-v1-report.json",
);
const historicalKeywordSpecialAbilityRules = byName.get(
  "official-keyword-special-ability-rules-rule-slice-v1-report.json",
);
const historicalAbilityTimingPriorityRules = byName.get(
  "official-ability-timing-priority-rules-rule-slice-v1-report.json",
);
const historicalCardBuildPaymentRules = byName.get(
  "official-card-build-payment-rules-rule-slice-v1-report.json",
);
const historicalUnitCardSupplyRules = byName.get(
  "official-unit-card-supply-rules-rule-slice-v1-report.json",
);
const historicalRoundPhaseActivationRules = byName.get(
  "official-round-phase-activation-rules-rule-slice-v1-report.json",
);
const current = byName.get(
  "official-supply-pool-rules-rule-slice-v1-report.json",
);
const developmentTranche = byName.get(
  "official-development-tranche-source-lock-report.json",
);
const historicalV4 = byName.get("official-out-of-coherency-close-ranks-rule-slice-v1-report.json");
const denominator = byName.get("official-canonical-rule-atom-denominator-v1-report.json");
const runtimeGate = byName.get("official-executable-rule-runtime-v1-report.json");
const liveSources = byName.get("official-live-source-snapshots-report.json");
const commandCenter = byName.get("official-command-center-adapter-report.json");
const latestData = byName.get("official-latest-data-binding-report.json");
const communityDrift = byName.get("official-command-center-community-drift-report.json");
const communityDriftV2 = byName.get("official-command-center-community-drift-v2-report.json");

const acceptance = [];

async function check(id, fn) {
  try {
    await fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

await check("foundation_base_report_and_assertion_denominator_is_exact", () => {
  assert.equal(reportNames.length, EXPECTED_BASE_REPORTS);
  const totals = reports.reduce((sum, { report }) => {
    assert(Number.isInteger(report.acceptancePassed), `${report.schema || "unknown"}: missing acceptancePassed`);
    assert(Number.isInteger(report.acceptanceTotal), `${report.schema || "unknown"}: missing acceptanceTotal`);
    return {
      passed: sum.passed + report.acceptancePassed,
      total: sum.total + report.acceptanceTotal,
    };
  }, { passed: 0, total: 0 });
  assert.deepEqual(totals, { passed: EXPECTED_BASE_ASSERTIONS, total: EXPECTED_BASE_ASSERTIONS });
});

await check("every_base_report_is_green_and_internally_consistent", () => {
  for (const { name, report } of reports) {
    assert.equal(report.acceptancePassed, report.acceptanceTotal, `${name}: not all acceptance items passed`);
    if (Array.isArray(report.acceptance)) {
      assert.equal(report.acceptance.length, report.acceptanceTotal, `${name}: acceptance length drifted`);
      assert(report.acceptance.every((item) => (
        (typeof item === "string" && item.length > 0)
          || (item && typeof item === "object" && item.passed === true)
      )), `${name}: acceptance item failed`);
    }
    if (Array.isArray(report.failures)) assert.equal(report.failures.length, 0, `${name}: failures are not empty`);
  }
});

await check("canonical_denominator_and_current_dispositions_partition_exactly", () => {
  assert(denominator && current, "denominator or current slice report missing");
  assert.deepEqual(denominator.audit.counts.byDisposition, {
    executable: 0,
    display_only: 114,
    review_required: 912,
    quarantined: 0,
  });
  assert.equal(denominator.audit.counts.ruleAtoms, 1026);
  assert.deepEqual(current.sliceAudit.counts, {
    executableRuleAtoms: EXPECTED_CURRENT.executableRuleAtoms,
    newlyExecutableRuleAtoms: EXPECTED_CURRENT.newlyExecutableRuleAtoms,
    reviewRequiredRuleAtoms: EXPECTED_CURRENT.reviewRequiredRuleAtoms,
    displayOnlyRuleAtoms: EXPECTED_CURRENT.displayOnlyRuleAtoms,
    strictCompleteAtoms: EXPECTED_CURRENT.strictCompleteAtoms,
    partialContractAtoms: EXPECTED_CURRENT.partialContractAtoms,
    noContractAtoms: EXPECTED_CURRENT.noContractAtoms,
    declaredStateContractExecutors: EXPECTED_CURRENT.declaredStateContractExecutors,
    missingStateContractExecutors: EXPECTED_CURRENT.stateContractMissingExecutors,
  });
});

await check("current_slice_catalogue_runtime_and_lineage_are_exact", () => {
  assert.equal(current.slice.sliceHash, EXPECTED_CURRENT.sliceHash);
  assert.equal(current.slice.catalogueHash, EXPECTED_CURRENT.catalogueHash);
  assert.equal(current.catalogueHash, EXPECTED_CURRENT.catalogueHash);
  assert.equal(current.runtimeHash, EXPECTED_CURRENT.runtimeHash);
  assert.equal(
    current.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ROUND_PHASE_ACTIVATION_RULES.sliceHash,
  );
  assert.equal(
    current.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ROUND_PHASE_ACTIVATION_RULES.catalogueHash,
  );
  assert.equal(historicalRoundPhaseActivationRules.runtimeHash,
    EXPECTED_HISTORICAL_ROUND_PHASE_ACTIVATION_RULES.runtimeHash);
  assert.equal(historicalRoundPhaseActivationRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_UNIT_CARD_SUPPLY_RULES.sliceHash,
  );
  assert.equal(historicalRoundPhaseActivationRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_UNIT_CARD_SUPPLY_RULES.catalogueHash,
  );
  assert.equal(historicalUnitCardSupplyRules.runtimeHash,
    EXPECTED_HISTORICAL_UNIT_CARD_SUPPLY_RULES.runtimeHash);
  assert.equal(historicalUnitCardSupplyRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_CARD_BUILD_PAYMENT_RULES.sliceHash);
  assert.equal(historicalUnitCardSupplyRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_CARD_BUILD_PAYMENT_RULES.catalogueHash);
  assert.equal(historicalCardBuildPaymentRules.runtimeHash,
    EXPECTED_HISTORICAL_CARD_BUILD_PAYMENT_RULES.runtimeHash);
  assert.equal(historicalCardBuildPaymentRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ABILITY_TIMING_PRIORITY_RULES.sliceHash);
  assert.equal(historicalCardBuildPaymentRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ABILITY_TIMING_PRIORITY_RULES.catalogueHash);
  assert.equal(historicalAbilityTimingPriorityRules.runtimeHash,
    EXPECTED_HISTORICAL_ABILITY_TIMING_PRIORITY_RULES.runtimeHash);
  assert.equal(historicalAbilityTimingPriorityRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_KEYWORD_SPECIAL_ABILITY_RULES.sliceHash);
  assert.equal(historicalAbilityTimingPriorityRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_KEYWORD_SPECIAL_ABILITY_RULES.catalogueHash);
  assert.equal(historicalKeywordSpecialAbilityRules.runtimeHash,
    EXPECTED_HISTORICAL_KEYWORD_SPECIAL_ABILITY_RULES.runtimeHash);
  assert.equal(historicalKeywordSpecialAbilityRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_DICE_TEST_MODIFIER_RULES.sliceHash);
  assert.equal(historicalKeywordSpecialAbilityRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_DICE_TEST_MODIFIER_RULES.catalogueHash,
  );
  assert.equal(historicalDiceTestModifierRules.runtimeHash,
    EXPECTED_HISTORICAL_DICE_TEST_MODIFIER_RULES.runtimeHash);
  assert.equal(historicalDiceTestModifierRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_PLAYER_CONTROL_RELATIONSHIP_RULES.sliceHash);
  assert.equal(historicalDiceTestModifierRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_PLAYER_CONTROL_RELATIONSHIP_RULES.catalogueHash);
  assert.equal(historicalPlayerControlRelationshipRules.runtimeHash,
    EXPECTED_HISTORICAL_PLAYER_CONTROL_RELATIONSHIP_RULES.runtimeHash);
  assert.equal(historicalPlayerControlRelationshipRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MODEL_BASE_GEOMETRY_RULES.sliceHash);
  assert.equal(historicalPlayerControlRelationshipRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MODEL_BASE_GEOMETRY_RULES.catalogueHash);
  assert.equal(historicalModelBaseGeometryRules.runtimeHash,
    EXPECTED_HISTORICAL_MODEL_BASE_GEOMETRY_RULES.runtimeHash);
  assert.equal(historicalModelBaseGeometryRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_SPECIAL_TERRAIN_RULES.sliceHash);
  assert.equal(historicalModelBaseGeometryRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_SPECIAL_TERRAIN_RULES.catalogueHash);
  assert.equal(historicalSpecialTerrainRules.runtimeHash,
    EXPECTED_HISTORICAL_SPECIAL_TERRAIN_RULES.runtimeHash);
  assert.equal(historicalSpecialTerrainRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ELEVATION_EFFECTIVE_SIZE_RULES.sliceHash);
  assert.equal(historicalSpecialTerrainRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ELEVATION_EFFECTIVE_SIZE_RULES.catalogueHash);
  assert.equal(historicalElevationEffectiveSizeRules.runtimeHash,
    EXPECTED_HISTORICAL_ELEVATION_EFFECTIVE_SIZE_RULES.runtimeHash);
  assert.equal(historicalElevationEffectiveSizeRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_TERRAIN_LOS_RULES.sliceHash);
  assert.equal(historicalElevationEffectiveSizeRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_TERRAIN_LOS_RULES.catalogueHash);
  assert.equal(historicalTerrainLosRules.runtimeHash,
    EXPECTED_HISTORICAL_TERRAIN_LOS_RULES.runtimeHash);
  assert.equal(historicalTerrainLosRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_FLYING_RULES.sliceHash);
  assert.equal(historicalTerrainLosRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_FLYING_RULES.catalogueHash);
  assert.equal(historicalFlyingRules.runtimeHash,
    EXPECTED_HISTORICAL_FLYING_RULES.runtimeHash);
  assert.equal(historicalFlyingRules.slice.previousSliceHash,
    EXPECTED_HISTORICAL_GAP_PLACE_GEOMETRY.sliceHash);
  assert.equal(historicalFlyingRules.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_GAP_PLACE_GEOMETRY.catalogueHash);
  assert.equal(historicalGapPlaceGeometry.runtimeHash,
    EXPECTED_HISTORICAL_GAP_PLACE_GEOMETRY.runtimeHash);
  assert.equal(historicalGapPlaceGeometry.slice.previousSliceHash,
    EXPECTED_HISTORICAL_DIRECT_MOVEMENT_DISPLACEMENT.sliceHash);
  assert.equal(historicalGapPlaceGeometry.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_DIRECT_MOVEMENT_DISPLACEMENT.catalogueHash);
  assert.equal(historicalDirectMovementDisplacement.runtimeHash,
    EXPECTED_HISTORICAL_DIRECT_MOVEMENT_DISPLACEMENT.runtimeHash);
  assert.equal(historicalDirectMovementDisplacement.slice.previousSliceHash,
    EXPECTED_HISTORICAL_CLOSE_COMBAT_LIFECYCLE.sliceHash);
  assert.equal(historicalDirectMovementDisplacement.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_CLOSE_COMBAT_LIFECYCLE.catalogueHash,
  );
  assert.equal(historicalCloseCombatLifecycle.runtimeHash,
    EXPECTED_HISTORICAL_CLOSE_COMBAT_LIFECYCLE.runtimeHash);
  assert.equal(historicalCloseCombatLifecycle.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ATTACK_POOL_EDGE.sliceHash);
  assert.equal(historicalCloseCombatLifecycle.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ATTACK_POOL_EDGE.catalogueHash);
  assert.equal(historicalAttackPoolEdge.runtimeHash,
    EXPECTED_HISTORICAL_ATTACK_POOL_EDGE.runtimeHash);
  assert.equal(historicalAttackPoolEdge.slice.previousSliceHash,
    EXPECTED_HISTORICAL_TEMPLATE_WEAPON.sliceHash,
  );
  assert.equal(historicalAttackPoolEdge.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_TEMPLATE_WEAPON.catalogueHash,
  );
  assert.equal(historicalTemplateWeapon.runtimeHash,
    EXPECTED_HISTORICAL_TEMPLATE_WEAPON.runtimeHash);
  assert.equal(historicalTemplateWeapon.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ASSAULT_RUN.sliceHash);
  assert.equal(historicalTemplateWeapon.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ASSAULT_RUN.catalogueHash);
  assert.equal(historicalAssaultRun.runtimeHash, EXPECTED_HISTORICAL_ASSAULT_RUN.runtimeHash);
  assert.equal(historicalAssaultRun.slice.previousSliceHash,
    EXPECTED_HISTORICAL_IMPACT.sliceHash);
  assert.equal(historicalAssaultRun.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_IMPACT.catalogueHash);
  assert.equal(historicalImpact.runtimeHash, EXPECTED_HISTORICAL_IMPACT.runtimeHash);
  assert.equal(historicalImpact.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MARINE_CHARGE_V2.sliceHash);
  assert.equal(historicalImpact.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MARINE_CHARGE_V2.catalogueHash);
  assert.equal(
    historicalMarineChargeV2.runtimeHash,
    EXPECTED_HISTORICAL_MARINE_CHARGE_V2.runtimeHash,
  );
  assert.equal(
    historicalMarineChargeV2.slice.previousSliceHash,
    EXPECTED_HISTORICAL_STIMPACK_CURRENT_V2_CONTRACT.sliceHash,
  );
  assert.equal(
    historicalMarineChargeV2.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_STIMPACK_CURRENT_V2_CONTRACT.catalogueHash,
  );
  assert.equal(
    historicalStimpackCurrentV2Contract.runtimeHash,
    EXPECTED_HISTORICAL_STIMPACK_CURRENT_V2_CONTRACT.runtimeHash,
  );
  assert.equal(
    historicalStimpackCurrentV2Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_SPECIALIST_V2_CONTRACT.sliceHash,
  );
  assert.equal(
    historicalStimpackCurrentV2Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_SPECIALIST_V2_CONTRACT.catalogueHash,
  );
  assert.equal(historicalSpecialistV2Contract.runtimeHash,
    EXPECTED_HISTORICAL_SPECIALIST_V2_CONTRACT.runtimeHash);
  assert.equal(historicalSpecialistV2Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_SIDEARM_PINPOINT_V2_CONTRACT.sliceHash);
  assert.equal(historicalSpecialistV2Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_SIDEARM_PINPOINT_V2_CONTRACT.catalogueHash);
  assert.equal(historicalCombatTagShieldedV2Contract.runtimeHash,
    EXPECTED_HISTORICAL_COMBAT_TAG_SHIELDED_V2_CONTRACT.runtimeHash);
  assert.equal(historicalCombatTagShieldedV2Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_GOLIATH_SCATTER_V2_CONTRACT.sliceHash);
  assert.equal(historicalCombatTagShieldedV2Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_GOLIATH_SCATTER_V2_CONTRACT.catalogueHash);
  assert.equal(historicalGoliathScatterV2Contract.runtimeHash,
    EXPECTED_HISTORICAL_GOLIATH_SCATTER_V2_CONTRACT.runtimeHash);
  assert.equal(historicalGoliathScatterV2Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT_V2_CONTRACT.sliceHash);
  assert.equal(historicalGoliathScatterV2Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT_V2_CONTRACT.catalogueHash);
  assert.equal(historicalLifeSupportV2Contract.runtimeHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT_V2_CONTRACT.runtimeHash);
  assert.equal(historicalLifeSupportV2Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ACADEMY_MEDIC_V2_CONTRACT.sliceHash);
  assert.equal(historicalLifeSupportV2Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ACADEMY_MEDIC_V2_CONTRACT.catalogueHash);
  assert.equal(historicalAcademyMedicV2Contract.runtimeHash,
    EXPECTED_HISTORICAL_ACADEMY_MEDIC_V2_CONTRACT.runtimeHash);
  assert.equal(historicalAcademyMedicV2Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_RANGED_ATTACK_V6_CONTRACT.sliceHash);
  assert.equal(historicalAcademyMedicV2Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_ATTACK_V6_CONTRACT.catalogueHash);
  assert.equal(historicalRangedAttackV6Contract.runtimeHash,
    EXPECTED_HISTORICAL_RANGED_ATTACK_V6_CONTRACT.runtimeHash);
  assert.equal(historicalRangedAttackV6Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MEDPACK_V2_CONTRACT.sliceHash);
  assert.equal(historicalRangedAttackV6Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MEDPACK_V2_CONTRACT.catalogueHash);
  assert.equal(historicalMedicMedpackV2Contract.runtimeHash,
    EXPECTED_HISTORICAL_MEDPACK_V2_CONTRACT.runtimeHash);
  assert.equal(historicalMedicMedpackV2Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MOVEMENT_V4_CONTRACT.sliceHash,
  );
  assert.equal(
    historicalMedicMedpackV2Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MOVEMENT_V4_CONTRACT.catalogueHash,
  );
  assert.equal(historicalMovementV4Contract.runtimeHash,
    EXPECTED_HISTORICAL_MOVEMENT_V4_CONTRACT.runtimeHash);
  assert.equal(historicalMovementV4Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MOVEMENT_V3_CONTRACT.sliceHash);
  assert.equal(historicalMovementV4Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MOVEMENT_V3_CONTRACT.catalogueHash);
  assert.equal(historicalMovementV3Contract.runtimeHash,
    EXPECTED_HISTORICAL_MOVEMENT_V3_CONTRACT.runtimeHash);
  assert.equal(historicalMovementV3Contract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_STANDARD_MOVE_CONTRACT.sliceHash);
  assert.equal(historicalMovementV3Contract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_STANDARD_MOVE_CONTRACT.catalogueHash);
  assert.equal(historicalStandardMoveContract.runtimeHash,
    EXPECTED_HISTORICAL_STANDARD_MOVE_CONTRACT.runtimeHash);
  assert.equal(historicalStandardMoveContract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_RESERVE_CONTRACT.sliceHash);
  assert.equal(historicalStandardMoveContract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RESERVE_CONTRACT.catalogueHash);
  assert.equal(historicalReserveContract.runtimeHash,
    EXPECTED_HISTORICAL_RESERVE_CONTRACT.runtimeHash);
  assert.equal(historicalReserveContract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_START_OF_ROUND.sliceHash);
  assert.equal(historicalReserveContract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_START_OF_ROUND.catalogueHash);
  assert.equal(historicalStartOfRound.runtimeHash, EXPECTED_HISTORICAL_START_OF_ROUND.runtimeHash);
  assert.equal(
    historicalStartOfRound.slice.previousSliceHash,
    EXPECTED_HISTORICAL_DETERMINE_INITIATIVE.sliceHash,
  );
  assert.equal(
    historicalStartOfRound.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_DETERMINE_INITIATIVE.catalogueHash,
  );
  assert.equal(
    historicalDetermineInitiative.runtimeHash,
    EXPECTED_HISTORICAL_DETERMINE_INITIATIVE.runtimeHash,
  );
  assert.equal(
    historicalDetermineInitiative.slice.previousSliceHash,
    EXPECTED_HISTORICAL_CLEANUP_REFRESH.sliceHash,
  );
  assert.equal(
    historicalDetermineInitiative.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_CLEANUP_REFRESH.catalogueHash,
  );
  assert.equal(
    historicalCleanupRefresh.runtimeHash,
    EXPECTED_HISTORICAL_CLEANUP_REFRESH.runtimeHash,
  );
  assert.equal(
    historicalCleanupRefresh.slice.previousSliceHash,
    EXPECTED_HISTORICAL_END_OF_ROUND_EFFECTS.sliceHash,
  );
  assert.equal(
    historicalCleanupRefresh.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_END_OF_ROUND_EFFECTS.catalogueHash,
  );
  assert.equal(
    historicalEndOfRoundEffects.runtimeHash,
    EXPECTED_HISTORICAL_END_OF_ROUND_EFFECTS.runtimeHash,
  );
  assert.equal(
    historicalEndOfRoundEffects.slice.previousSliceHash,
    EXPECTED_HISTORICAL_HOLD_POSITION_END_GAME.sliceHash,
  );
  assert.equal(
    historicalEndOfRoundEffects.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_HOLD_POSITION_END_GAME.catalogueHash,
  );
  assert.equal(
    historicalHoldPositionEndGame.runtimeHash,
    EXPECTED_HISTORICAL_HOLD_POSITION_END_GAME.runtimeHash,
  );
  assert.equal(
    historicalHoldPositionEndGame.slice.previousSliceHash,
    EXPECTED_HISTORICAL_VICTORY_POINT.sliceHash,
  );
  assert.equal(
    historicalHoldPositionEndGame.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_VICTORY_POINT.catalogueHash,
  );
  assert.equal(
    historicalVictoryPoint.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MISSION_MARKER.sliceHash,
  );
  assert.equal(
    historicalVictoryPoint.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MISSION_MARKER.catalogueHash,
  );
  assert.equal(
    historicalMissionMarker.slice.previousSliceHash,
    EXPECTED_HISTORICAL_COMBAT_PASS.sliceHash,
  );
  assert.equal(
    historicalMissionMarker.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_COMBAT_PASS.catalogueHash,
  );
  assert.equal(
    historicalCombatPass.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ASSAULT_HOLD.sliceHash,
  );
  assert.equal(
    historicalCombatPass.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ASSAULT_HOLD.catalogueHash,
  );
  assert.equal(
    historicalAssaultHold.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MOVEMENT_HOLD.sliceHash,
  );
  assert.equal(
    historicalAssaultHold.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MOVEMENT_HOLD.catalogueHash,
  );
  assert.equal(
    historicalMovementHold.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ACTIVATION_PASS.sliceHash,
  );
  assert.equal(
    historicalMovementHold.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ACTIVATION_PASS.catalogueHash,
  );
  assert.equal(
    historicalActivationPass.slice.previousSliceHash,
    EXPECTED_HISTORICAL_EXISTING_CONTRACT.sliceHash,
  );
  assert.equal(
    historicalActivationPass.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_EXISTING_CONTRACT.catalogueHash,
  );
  assert.equal(
    historicalExistingContract.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MULTI_ENEMY_STIMPACK.sliceHash,
  );
  assert.equal(
    historicalExistingContract.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MULTI_ENEMY_STIMPACK.catalogueHash,
  );
  assert.equal(
    historicalMultiEnemyStimpack.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MULTI_ENEMY_CASUALTY.sliceHash,
  );
  assert.equal(
    historicalMultiEnemyStimpack.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MULTI_ENEMY_CASUALTY.catalogueHash,
  );
  assert.equal(
    historicalMultiModelCasualty.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_STIMPACK_CLOSE_COMBAT.sliceHash,
  );
  assert.equal(
    historicalMultiModelCasualty.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_STIMPACK_CLOSE_COMBAT.catalogueHash,
  );
  assert.equal(
    historicalMultiModelStimpackCloseCombat.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_DENOMINATOR.sliceHash,
  );
  assert.equal(
    historicalMultiModelStimpackCloseCombat.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_DENOMINATOR.catalogueHash,
  );
  assert.equal(
    historicalRelationship.slice.previousSliceHash,
    EXPECTED_HISTORICAL_OPTIONAL_STIMPACK_MOVE.sliceHash,
  );
  assert.equal(
    historicalRelationship.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_OPTIONAL_STIMPACK_MOVE.catalogueHash,
  );
  assert.equal(
    historicalOptionalStimpackMove.slice.previousSliceHash,
    EXPECTED_HISTORICAL_STIMPACK_MOVE.sliceHash,
  );
  assert.equal(
    historicalOptionalStimpackMove.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_STIMPACK_MOVE.catalogueHash,
  );
  assert.equal(
    historicalMarineStimpack.slice.previousSliceHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT.sliceHash,
  );
  assert.equal(
    historicalMarineStimpack.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT.catalogueHash,
  );
  assert.equal(
    historicalLifeSupport.slice.previousSliceHash,
    EXPECTED_HISTORICAL_RESTORATION_RANGE.sliceHash,
  );
  assert.equal(
    historicalLifeSupport.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RESTORATION_RANGE.catalogueHash,
  );
  assert.equal(
    historicalRestorationRange.slice.previousSliceHash,
    EXPECTED_HISTORICAL_ACADEMY_OPTICAL_FLARE.sliceHash,
  );
  assert.equal(
    historicalRestorationRange.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_ACADEMY_OPTICAL_FLARE.catalogueHash,
  );
  assert.equal(
    historicalAcademyOpticalFlare.slice.previousSliceHash,
    EXPECTED_HISTORICAL_MEDIC_MEDPACK.sliceHash,
  );
  assert.equal(
    historicalAcademyOpticalFlare.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_MEDIC_MEDPACK.catalogueHash,
  );
  assert.equal(
    historicalMedicMedpack.slice.previousSliceHash,
    EXPECTED_HISTORICAL_COMBAT_TAG_SHIELDED.sliceHash,
  );
  assert.equal(
    historicalMedicMedpack.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_COMBAT_TAG_SHIELDED.catalogueHash,
  );
  assert.equal(
    historicalCombatTagShielded.slice.previousSliceHash,
    EXPECTED_HISTORICAL_INDIRECT_LOCKED.sliceHash,
  );
  assert.equal(
    historicalCombatTagShielded.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_INDIRECT_LOCKED.catalogueHash,
  );
  assert.equal(
    historicalIndirectLocked.slice.previousSliceHash,
    EXPECTED_HISTORICAL_SIDEARM_PINPOINT.sliceHash,
  );
  assert.equal(
    historicalIndirectLocked.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_SIDEARM_PINPOINT.catalogueHash,
  );
  assert.equal(
    historicalSidearmPinpoint.slice.previousSliceHash,
    EXPECTED_HISTORICAL_SPECIALIST_RANGED_BATCH.sliceHash,
  );
  assert.equal(
    historicalSidearmPinpoint.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_SPECIALIST_RANGED_BATCH.catalogueHash,
  );
  assert.equal(
    historicalSpecialistRangedBatch.slice.previousSliceHash,
    EXPECTED_HISTORICAL_SPECIALIST_LOADOUT.sliceHash,
  );
  assert.equal(
    historicalSpecialistRangedBatch.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_SPECIALIST_LOADOUT.catalogueHash,
  );
  assert.equal(
    historicalSpecialistLoadout.slice.previousSliceHash,
    EXPECTED_HISTORICAL_CLOSE_V8.sliceHash,
  );
  assert.equal(
    historicalSpecialistLoadout.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_CLOSE_V8.catalogueHash,
  );
  assert.equal(
    historicalCloseV8.slice.previousSliceHash,
    EXPECTED_HISTORICAL_CLOSE_V7.sliceHash,
  );
  assert.equal(
    historicalCloseV8.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_CLOSE_V7.catalogueHash,
  );
  assert.equal(
    historicalCloseV7.slice.previousSliceHash,
    EXPECTED_HISTORICAL_CLOSE_V6.sliceHash,
  );
  assert.equal(
    historicalCloseV7.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_CLOSE_V6.catalogueHash,
  );
  assert.equal(
    historicalCloseV6.slice.previousSliceHash,
    EXPECTED_HISTORICAL_RANGED_V6.sliceHash,
  );
  assert.equal(
    historicalCloseV6.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V6.catalogueHash,
  );
  assert.equal(historicalRangedV6.slice.previousSliceHash, EXPECTED_HISTORICAL_RANGED_V5.sliceHash);
  assert.equal(
    historicalRangedV6.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V5.catalogueHash,
  );
  assert.equal(historicalRangedV5.slice.previousSliceHash, EXPECTED_HISTORICAL_RANGED_V4.sliceHash);
  assert.equal(
    historicalRangedV5.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V4.catalogueHash,
  );
  assert.equal(historicalRangedV4.slice.previousSliceHash, EXPECTED_HISTORICAL_RANGED_V3.sliceHash);
  assert.equal(
    historicalRangedV4.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V3.catalogueHash,
  );
  assert.equal(historicalRangedV3.slice.previousSliceHash, EXPECTED_HISTORICAL_RANGED_V2.sliceHash);
  assert.equal(
    historicalRangedV3.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V2.catalogueHash,
  );
  assert.equal(historicalRangedV2.slice.previousSliceHash, EXPECTED_HISTORICAL_RANGED.sliceHash);
  assert.equal(
    historicalRangedV2.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_RANGED.catalogueHash,
  );
  assert.equal(
    historicalRanged.slice.previousSliceHash,
    EXPECTED_HISTORICAL_DISENGAGE_CASUALTY.sliceHash,
  );
  assert.equal(
    historicalRanged.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_DISENGAGE_CASUALTY.catalogueHash,
  );
  assert.equal(disengageCasualty.slice.previousSliceHash, EXPECTED_HISTORICAL_DISENGAGE.sliceHash);
  assert.equal(
    disengageCasualty.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_DISENGAGE.catalogueHash,
  );
  assert.equal(disengage.slice.previousSliceHash, EXPECTED_HISTORICAL_STANDARD.sliceHash);
  assert.equal(disengage.slice.previousCatalogueHash, EXPECTED_HISTORICAL_STANDARD.catalogueHash);
  assert.equal(standardMove.slice.previousSliceHash, EXPECTED_HISTORICAL_RESERVE.sliceHash);
  assert.equal(standardMove.slice.previousCatalogueHash, EXPECTED_HISTORICAL_RESERVE.catalogueHash);
  assert.equal(reserve.slice.previousSliceHash, EXPECTED_HISTORICAL_START.sliceHash);
  assert.equal(reserve.slice.previousCatalogueHash, EXPECTED_HISTORICAL_START.catalogueHash);
  assert.equal(startOfRound.slice.previousSliceHash, EXPECTED_HISTORICAL_DETERMINE.sliceHash);
  assert.equal(startOfRound.slice.previousCatalogueHash, EXPECTED_HISTORICAL_DETERMINE.catalogueHash);
  assert.equal(determine.slice.previousSliceHash, EXPECTED_HISTORICAL_CLEANUP.sliceHash);
  assert.equal(determine.slice.previousCatalogueHash, EXPECTED_HISTORICAL_CLEANUP.catalogueHash);
  assert.equal(cleanup.slice.previousSliceHash, EXPECTED_HISTORICAL_EOR.sliceHash);
  assert.equal(cleanup.slice.previousCatalogueHash, EXPECTED_HISTORICAL_EOR.catalogueHash);
  assert.equal(endOfRound.slice.previousSliceHash, EXPECTED_HISTORICAL_END_GAME.sliceHash);
  assert.equal(
    endOfRound.slice.previousCatalogueHash,
    EXPECTED_HISTORICAL_END_GAME.catalogueHash,
  );
  assert.equal(endGame.slice.previousSliceHash, EXPECTED_HISTORICAL_SCORING.sliceHash);
  assert.equal(endGame.slice.previousCatalogueHash, EXPECTED_HISTORICAL_SCORING.catalogueHash);
  assert.equal(scoring.slice.previousSliceHash, EXPECTED_HISTORICAL_MARKER.sliceHash);
  assert.equal(scoring.slice.previousCatalogueHash, EXPECTED_HISTORICAL_MARKER.catalogueHash);
  assert.equal(mission.slice.previousSliceHash, historicalV4.slice.sliceHash);
  assert.equal(mission.slice.previousCatalogueHash, historicalV4.slice.catalogueHash);
});

await check("frozen_official_gameplay_baseline_and_versions_agree_without_repository_fallback", () => {
  assert.equal(current.slice.officialDataPolicy.currentValueAuthority,
    "current_official_command_center_71_69_48");
  assert.equal(current.slice.officialDataPolicy.officialSourceSnapshotHash,
    EXPECTED_OFFICIAL_LATEST.sourceSnapshotHash);
  assert.equal(current.slice.officialDataPolicy.officialDatasetHash,
    EXPECTED_OFFICIAL_LATEST.datasetHash);
  assert.equal(communityDrift.previousOfficialSnapshot.snapshotHash,
    EXPECTED_OFFICIAL_BASELINE.sourceSnapshotHash);
  assert.equal(communityDrift.currentOfficialSnapshot.snapshot.snapshotHash,
    EXPECTED_OFFICIAL.sourceSnapshotHash);
  assert.equal(communityDrift.currentOfficialSnapshot.datasetHash, EXPECTED_OFFICIAL.datasetHash);
  assert.equal(communityDrift.officialProductChanges, 0);
  assert.equal(communityDrift.ruleProseChanges, 0);
  assert.equal(communityDrift.communityDisplayOnlyChanges, 2);
  assert.equal(communityDriftV2.previousOfficialSnapshot.snapshotHash,
    EXPECTED_OFFICIAL.sourceSnapshotHash);
  assert.equal(communityDriftV2.currentOfficialSnapshot.snapshot.snapshotHash,
    EXPECTED_OFFICIAL_LATEST.sourceSnapshotHash);
  assert.equal(communityDriftV2.currentOfficialSnapshot.datasetHash,
    EXPECTED_OFFICIAL_LATEST.datasetHash);
  assert.deepEqual(communityDriftV2.currentOfficialSnapshot.dataVersions,
    EXPECTED_OFFICIAL_LATEST.dataVersions);
  assert.equal(communityDriftV2.officialProductChanges, 0);
  assert.equal(communityDriftV2.ruleProseChanges, 0);
  assert.equal(communityDriftV2.communityDisplayOnlyChanges, 9);
  assert.equal(liveSources.commandSnapshot.snapshotHash, EXPECTED_OFFICIAL_BASELINE.sourceSnapshotHash);
  assert.deepEqual(liveSources.commandSnapshot.dataVersions, EXPECTED_OFFICIAL_BASELINE.dataVersions);
  assert.equal(commandCenter.dataset.sourceSnapshotHash, EXPECTED_OFFICIAL_BASELINE.sourceSnapshotHash);
  assert.equal(commandCenter.dataset.datasetHash, EXPECTED_OFFICIAL_BASELINE.datasetHash);
  assert.equal(commandCenter.repositoryFallbackAllowed, false);
  assert.equal(latestData.currentOfficialSnapshot.snapshotHash,
    EXPECTED_OFFICIAL_BASELINE.sourceSnapshotHash);
  assert.deepEqual(latestData.currentOfficialSnapshot.dataVersions,
    EXPECTED_OFFICIAL_BASELINE.dataVersions);
  assert.equal(latestData.productionSelection.repositoryFallbackAllowed, false);
  assert.equal(current.slice.officialDataPolicy.repositoryFallbackAllowed, false);
  assert.equal(current.slice.effectKernel.registeredEffectAtoms, 14);
  assert.equal(current.slice.effectKernel.executableEffectAtomIds.length, 14);
  assert.equal(current.slice.effectKernel.knownUnimplementedEffectAtoms, 0);
  assert.equal(current.slice.effectKernel.sidearmExecutable, true);
  assert.equal(current.slice.effectKernel.pinpointExecutable, true);
  assert.equal(current.slice.effectKernel.indirectFireExecutable, true);
  assert.equal(current.slice.effectKernel.lockedInExecutable, true);
  assert.equal(
    historicalIndirectLocked.slice.indirectFireLockedInProgress
      .sevenNonemptyProfileSubsetsExecutable,
    true,
  );
  assert.equal(
    historicalIndirectLocked.slice.indirectFireLockedInProgress
      .indirectFireOffLineOfSightExecutable,
    true,
  );
  assert.equal(
    historicalIndirectLocked.slice.indirectFireLockedInProgress
      .lockedInStationaryAdditionalRateOfAttack,
    6,
  );
  assert.equal(historicalCombatTagShielded.slice.combatTagShieldedProgress
    .groundTargetRestrictionExecutable, true);
  assert.equal(historicalCombatTagShielded.slice.combatTagShieldedProgress
    .lightSurgeTagMatchExecutable, true);
  assert.equal(historicalCombatTagShielded.slice.combatTagShieldedProgress
    .equalShieldDamageRetainsShieldedExecutable,
    true);
  assert.equal(historicalCombatTagShielded.slice.combatTagShieldedProgress
    .damageExceedingShieldLosesShieldedExecutable, true);
  assert.deepEqual(historicalCombatTagShielded.slice.combatTagShieldedProgress
    .deferredReviewRequiredRuleAtomIds, [
    "rule-atom:shielded-status-heal-restoration-forbidden",
    "rule-atom:singleton:core-11-shielded-dependent-abilities:03c5e18dd1a9",
  ]);
  assert.equal(current.slice.medpackProgress.shieldedRestorationProhibited, true);
  assert.equal(current.slice.medpackProgress.destroyedModelReturnProhibited, true);
  assert.deepEqual(current.slice.medpackProgress.windowsExecutable,
    ["before_action", "after_action"]);
  assert.equal(
    historicalMultiEnemyStimpack.slice.historicalCompatibility.previousEffectDenominatorHash,
    "2bffb9ec79f6439385b72ca1ccbc679e3ff5d843cf0d00fa15365df222b5188b",
  );
  assert.equal(reserve.liveOfficialRevalidation.officialProductGameplayDriftCount, 0);
  assert.equal(reserve.liveOfficialRevalidation.communityDisplayOnlyMetadataDrift.length, 2);
  assert.equal(reserve.liveOfficialRevalidation.frozenFullRawSnapshotIsByteLatest, false);
});

await check("historical_v4_catalogue_runtime_and_rules_display_remain_frozen", () => {
  assert.deepEqual(mission.historical, {
    ...EXPECTED_HISTORICAL_V4,
    rulesDisplayPreserved: true,
  });
  assert.equal(historicalV4.slice.catalogueHash, EXPECTED_HISTORICAL_V4.catalogueHash);
  assert.equal(historicalV4.runtime.runtimeHash, EXPECTED_HISTORICAL_V4.runtimeHash);
  assert.equal(historicalV4.runtime.executableRuleAtomCount, EXPECTED_HISTORICAL_V4.executableRuleAtomCount);
  assert.equal(mission.slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(scoring.historicalCatalogueHash, EXPECTED_HISTORICAL_MARKER.catalogueHash);
  assert.equal(scoring.historicalRuntimeHash, EXPECTED_HISTORICAL_MARKER.runtimeHash);
  assert.equal(scoring.slice.historicalCompatibility.previousFightV4ExecutorFrozen, true);
  assert.equal(scoring.slice.historicalCompatibility.previousMarkerV1ExecutorFrozen, true);
  assert.equal(scoring.slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(endGame.historicalSliceHash, EXPECTED_HISTORICAL_SCORING.sliceHash);
  assert.equal(endGame.historicalCatalogueHash, EXPECTED_HISTORICAL_SCORING.catalogueHash);
  assert.equal(endGame.historicalRuntimeHash, EXPECTED_HISTORICAL_SCORING.runtimeHash);
  assert.equal(endGame.slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(endOfRound.historicalSliceHash, EXPECTED_HISTORICAL_END_GAME.sliceHash);
  assert.equal(
    endOfRound.historicalCatalogueHash,
    EXPECTED_HISTORICAL_END_GAME.catalogueHash,
  );
  assert.equal(endOfRound.historicalRuntimeHash, EXPECTED_HISTORICAL_END_GAME.runtimeHash);
  assert.equal(endOfRound.slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(cleanup.historicalSliceHash, EXPECTED_HISTORICAL_EOR.sliceHash);
  assert.equal(cleanup.historicalCatalogueHash, EXPECTED_HISTORICAL_EOR.catalogueHash);
  assert.equal(cleanup.historicalRuntimeHash, EXPECTED_HISTORICAL_EOR.runtimeHash);
  assert.equal(cleanup.slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(determine.historicalSliceHash, EXPECTED_HISTORICAL_CLEANUP.sliceHash);
  assert.equal(determine.historicalCatalogueHash, EXPECTED_HISTORICAL_CLEANUP.catalogueHash);
  assert.equal(determine.historicalRuntimeHash, EXPECTED_HISTORICAL_CLEANUP.runtimeHash);
  assert.equal(determine.slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(historicalDetermineInitiative.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_CLEANUP_REFRESH.sliceHash);
  assert.equal(historicalDetermineInitiative.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_CLEANUP_REFRESH.catalogueHash);
  assert.equal(historicalDetermineInitiative.slice.historicalCompatibility.previousRuntimeHash,
    EXPECTED_HISTORICAL_CLEANUP_REFRESH.runtimeHash);
  assert.equal(historicalDetermineInitiative.slice.historicalCompatibility
    .silentCompatibilityAllowed, false);
  assert.equal(historicalMovementV3Contract.historicalSliceHash,
    EXPECTED_HISTORICAL_STANDARD_MOVE_CONTRACT.sliceHash);
  assert.equal(historicalMovementV3Contract.historicalCatalogueHash,
    EXPECTED_HISTORICAL_STANDARD_MOVE_CONTRACT.catalogueHash);
  assert.equal(historicalMovementV3Contract.historicalRuntimeHash,
    EXPECTED_HISTORICAL_STANDARD_MOVE_CONTRACT.runtimeHash);
  assert.equal(historicalStartOfRound.historicalSliceHash,
    EXPECTED_HISTORICAL_DETERMINE_INITIATIVE.sliceHash);
  assert.equal(historicalStartOfRound.historicalCatalogueHash,
    EXPECTED_HISTORICAL_DETERMINE_INITIATIVE.catalogueHash);
  assert.equal(historicalStartOfRound.historicalRuntimeHash,
    EXPECTED_HISTORICAL_DETERMINE_INITIATIVE.runtimeHash);
  assert.equal(startOfRound.historicalSliceHash, EXPECTED_HISTORICAL_DETERMINE.sliceHash);
  assert.equal(startOfRound.historicalCatalogueHash, EXPECTED_HISTORICAL_DETERMINE.catalogueHash);
  assert.equal(startOfRound.historicalRuntimeHash, EXPECTED_HISTORICAL_DETERMINE.runtimeHash);
  assert.equal(startOfRound.slice.historicalCompatibility.silentCompatibilityAllowed, false);
  assert.equal(reserve.historicalSliceHash, EXPECTED_HISTORICAL_START.sliceHash);
  assert.equal(reserve.historicalCatalogueHash, EXPECTED_HISTORICAL_START.catalogueHash);
  assert.equal(reserve.historicalRuntimeHash, EXPECTED_HISTORICAL_START.runtimeHash);
  assert.equal(standardMove.historicalSliceHash, EXPECTED_HISTORICAL_RESERVE.sliceHash);
  assert.equal(standardMove.historicalCatalogueHash, EXPECTED_HISTORICAL_RESERVE.catalogueHash);
  assert.equal(standardMove.historicalRuntimeHash, EXPECTED_HISTORICAL_RESERVE.runtimeHash);
  assert.equal(disengage.historicalSliceHash, EXPECTED_HISTORICAL_STANDARD.sliceHash);
  assert.equal(disengage.historicalCatalogueHash, EXPECTED_HISTORICAL_STANDARD.catalogueHash);
  assert.equal(disengage.historicalRuntimeHash, EXPECTED_HISTORICAL_STANDARD.runtimeHash);
  assert.equal(
    disengageCasualty.historicalSliceHash,
    EXPECTED_HISTORICAL_DISENGAGE.sliceHash,
  );
  assert.equal(
    disengageCasualty.historicalCatalogueHash,
    EXPECTED_HISTORICAL_DISENGAGE.catalogueHash,
  );
  assert.equal(
    disengageCasualty.historicalRuntimeHash,
    EXPECTED_HISTORICAL_DISENGAGE.runtimeHash,
  );
  assert.equal(
    historicalMarineStimpack.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT.sliceHash,
  );
  assert.equal(
    historicalMarineStimpack.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT.catalogueHash,
  );
  assert.equal(
    historicalMarineStimpack.historicalRuntimeHash,
    EXPECTED_HISTORICAL_LIFE_SUPPORT.runtimeHash,
  );
  assert.equal(
    current.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_ROUND_PHASE_ACTIVATION_RULES.sliceHash,
  );
  assert.equal(
    current.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_ROUND_PHASE_ACTIVATION_RULES.catalogueHash,
  );
  assert.equal(
    current.slice.historicalCompatibility.previousRuntimeHash,
    EXPECTED_HISTORICAL_ROUND_PHASE_ACTIVATION_RULES.runtimeHash,
  );
  assert.equal(
    historicalMedicMedpackV2Contract.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_MOVEMENT_V4_CONTRACT.sliceHash,
  );
  assert.equal(
    historicalMedicMedpackV2Contract.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_MOVEMENT_V4_CONTRACT.catalogueHash,
  );
  assert.equal(
    historicalMedicMedpackV2Contract.slice.historicalCompatibility.previousRuntimeHash,
    EXPECTED_HISTORICAL_MOVEMENT_V4_CONTRACT.runtimeHash,
  );
  assert.equal(
    historicalVictoryPoint.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_MISSION_MARKER.sliceHash,
  );
  assert.equal(
    historicalVictoryPoint.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_MISSION_MARKER.catalogueHash,
  );
  assert.equal(
    historicalVictoryPoint.slice.historicalCompatibility.previousRuntimeHash,
    EXPECTED_HISTORICAL_MISSION_MARKER.runtimeHash,
  );
  assert.equal(
    historicalMissionMarker.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_COMBAT_PASS.sliceHash,
  );
  assert.equal(
    historicalMissionMarker.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_COMBAT_PASS.catalogueHash,
  );
  assert.equal(
    historicalMissionMarker.slice.historicalCompatibility.previousRuntimeHash,
    EXPECTED_HISTORICAL_COMBAT_PASS.runtimeHash,
  );
  assert.equal(
    historicalCombatPass.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_ASSAULT_HOLD.sliceHash,
  );
  assert.equal(
    historicalCombatPass.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_ASSAULT_HOLD.catalogueHash,
  );
  assert.equal(
    historicalCombatPass.slice.historicalCompatibility.previousRuntimeHash,
    EXPECTED_HISTORICAL_ASSAULT_HOLD.runtimeHash,
  );
  assert.equal(
    historicalAssaultHold.slice.historicalCompatibility.previousSliceHash,
    EXPECTED_HISTORICAL_MOVEMENT_HOLD.sliceHash,
  );
  assert.equal(
    historicalAssaultHold.slice.historicalCompatibility.previousCatalogueHash,
    EXPECTED_HISTORICAL_MOVEMENT_HOLD.catalogueHash,
  );
  assert.equal(
    historicalAssaultHold.slice.historicalCompatibility.previousRuntimeHash,
    EXPECTED_HISTORICAL_MOVEMENT_HOLD.runtimeHash,
  );
  assert.equal(
    historicalMultiEnemyStimpack.historicalSliceHash,
    EXPECTED_HISTORICAL_MULTI_ENEMY_CASUALTY.sliceHash,
  );
  assert.equal(
    historicalMultiEnemyStimpack.historicalCatalogueHash,
    EXPECTED_HISTORICAL_MULTI_ENEMY_CASUALTY.catalogueHash,
  );
  assert.equal(
    historicalMultiEnemyStimpack.historicalRuntimeHash,
    EXPECTED_HISTORICAL_MULTI_ENEMY_CASUALTY.runtimeHash,
  );
  assert.equal(
    historicalMultiEnemyCasualty.historicalSliceHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_CASUALTY.sliceHash,
  );
  assert.equal(
    historicalMultiEnemyCasualty.historicalCatalogueHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_CASUALTY.catalogueHash,
  );
  assert.equal(
    historicalMultiEnemyCasualty.historicalRuntimeHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_CASUALTY.runtimeHash,
  );
  assert.equal(
    historicalMultiModelCasualty.historicalSliceHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_STIMPACK_CLOSE_COMBAT.sliceHash,
  );
  assert.equal(
    historicalMultiModelCasualty.historicalCatalogueHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_STIMPACK_CLOSE_COMBAT.catalogueHash,
  );
  assert.equal(
    historicalMultiModelCasualty.historicalRuntimeHash,
    EXPECTED_HISTORICAL_MULTI_MODEL_STIMPACK_CLOSE_COMBAT.runtimeHash,
  );
  assert.equal(
    historicalMultiModelDenominator.historicalSliceHash,
    EXPECTED_HISTORICAL_STIMPACK_CLOSE_COMBAT.sliceHash,
  );
  assert.equal(
    historicalMultiModelDenominator.historicalCatalogueHash,
    EXPECTED_HISTORICAL_STIMPACK_CLOSE_COMBAT.catalogueHash,
  );
  assert.equal(
    historicalMultiModelDenominator.historicalRuntimeHash,
    EXPECTED_HISTORICAL_STIMPACK_CLOSE_COMBAT.runtimeHash,
  );
  assert.equal(
    historicalStimpackCloseCombat.historicalSliceHash,
    EXPECTED_HISTORICAL_RELATIONSHIP.sliceHash,
  );
  assert.equal(
    historicalStimpackCloseCombat.historicalCatalogueHash,
    EXPECTED_HISTORICAL_RELATIONSHIP.catalogueHash,
  );
  assert.equal(
    historicalStimpackCloseCombat.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RELATIONSHIP.runtimeHash,
  );
  assert.equal(
    historicalRelationship.historicalSliceHash,
    EXPECTED_HISTORICAL_OPTIONAL_STIMPACK_MOVE.sliceHash,
  );
  assert.equal(
    historicalRelationship.historicalCatalogueHash,
    EXPECTED_HISTORICAL_OPTIONAL_STIMPACK_MOVE.catalogueHash,
  );
  assert.equal(
    historicalRelationship.historicalRuntimeHash,
    EXPECTED_HISTORICAL_OPTIONAL_STIMPACK_MOVE.runtimeHash,
  );
  assert.equal(
    historicalOptionalStimpackMove.historicalSliceHash,
    EXPECTED_HISTORICAL_STIMPACK_MOVE.sliceHash,
  );
  assert.equal(
    historicalOptionalStimpackMove.historicalCatalogueHash,
    EXPECTED_HISTORICAL_STIMPACK_MOVE.catalogueHash,
  );
  assert.equal(
    historicalOptionalStimpackMove.historicalRuntimeHash,
    EXPECTED_HISTORICAL_STIMPACK_MOVE.runtimeHash,
  );
  assert.equal(
    historicalStimpackMove.historicalSliceHash,
    EXPECTED_HISTORICAL_MARINE_STIMPACK.sliceHash,
  );
  assert.equal(
    historicalStimpackMove.historicalCatalogueHash,
    EXPECTED_HISTORICAL_MARINE_STIMPACK.catalogueHash,
  );
  assert.equal(
    historicalStimpackMove.historicalRuntimeHash,
    EXPECTED_HISTORICAL_MARINE_STIMPACK.runtimeHash,
  );
  assert.equal(
    historicalLifeSupport.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RESTORATION_RANGE.runtimeHash,
  );
  assert.equal(
    historicalRestorationRange.historicalRuntimeHash,
    EXPECTED_HISTORICAL_ACADEMY_OPTICAL_FLARE.runtimeHash,
  );
  assert.equal(
    historicalAcademyOpticalFlare.historicalRuntimeHash,
    EXPECTED_HISTORICAL_MEDIC_MEDPACK.runtimeHash,
  );
  assert.equal(
    historicalMedicMedpack.historicalRuntimeHash,
    EXPECTED_HISTORICAL_COMBAT_TAG_SHIELDED.runtimeHash,
  );
  assert.equal(
    historicalCombatTagShielded.historicalSliceHash,
    EXPECTED_HISTORICAL_INDIRECT_LOCKED.sliceHash,
  );
  assert.equal(
    historicalCombatTagShielded.historicalCatalogueHash,
    EXPECTED_HISTORICAL_INDIRECT_LOCKED.catalogueHash,
  );
  assert.equal(
    historicalCombatTagShielded.historicalRuntimeHash,
    EXPECTED_HISTORICAL_INDIRECT_LOCKED.runtimeHash,
  );
  assert.equal(
    historicalIndirectLocked.historicalRuntimeHash,
    EXPECTED_HISTORICAL_SIDEARM_PINPOINT.runtimeHash,
  );
  assert.equal(
    historicalSpecialistRangedBatch.historicalRuntimeHash,
    EXPECTED_HISTORICAL_SPECIALIST_LOADOUT.runtimeHash,
  );
  assert.equal(
    historicalSpecialistLoadout.historicalRuntimeHash,
    EXPECTED_HISTORICAL_CLOSE_V8.runtimeHash,
  );
  assert.equal(
    historicalCloseV8.historicalRuntimeHash,
    EXPECTED_HISTORICAL_CLOSE_V7.runtimeHash,
  );
  assert.equal(
    historicalCloseV7.historicalRuntimeHash,
    EXPECTED_HISTORICAL_CLOSE_V6.runtimeHash,
  );
  assert.equal(
    historicalCloseV6.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RANGED_V6.runtimeHash,
  );
  assert.equal(historicalRangedV6.historicalSliceHash, EXPECTED_HISTORICAL_RANGED_V5.sliceHash);
  assert.equal(
    historicalRangedV6.historicalCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V5.catalogueHash,
  );
  assert.equal(
    historicalRangedV6.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RANGED_V5.runtimeHash,
  );
  assert.equal(historicalRangedV5.historicalSliceHash, EXPECTED_HISTORICAL_RANGED_V4.sliceHash);
  assert.equal(
    historicalRangedV5.historicalCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V4.catalogueHash,
  );
  assert.equal(
    historicalRangedV5.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RANGED_V4.runtimeHash,
  );
  assert.equal(historicalRangedV4.historicalSliceHash, EXPECTED_HISTORICAL_RANGED_V3.sliceHash);
  assert.equal(
    historicalRangedV4.historicalCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V3.catalogueHash,
  );
  assert.equal(
    historicalRangedV4.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RANGED_V3.runtimeHash,
  );
  assert.equal(historicalRangedV3.historicalSliceHash, EXPECTED_HISTORICAL_RANGED_V2.sliceHash);
  assert.equal(
    historicalRangedV3.historicalCatalogueHash,
    EXPECTED_HISTORICAL_RANGED_V2.catalogueHash,
  );
  assert.equal(
    historicalRangedV3.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RANGED_V2.runtimeHash,
  );
  assert.equal(historicalRangedV2.historicalSliceHash, EXPECTED_HISTORICAL_RANGED.sliceHash);
  assert.equal(
    historicalRangedV2.historicalCatalogueHash,
    EXPECTED_HISTORICAL_RANGED.catalogueHash,
  );
  assert.equal(
    historicalRangedV2.historicalRuntimeHash,
    EXPECTED_HISTORICAL_RANGED.runtimeHash,
  );
  assert.equal(current.slice.historicalCompatibility.silentCompatibilityAllowed, false);
});

await check("generic_runtime_gate_targets_the_current_catalogue_and_executor_manifest", () => {
  assert(runtimeGate && current, "runtime or current slice report missing");
  assert.equal(runtimeGate.runtimeDescriptor.catalogueHash, current.catalogueHash);
  assert.equal(runtimeGate.runtimeDescriptor.runtimeHash, current.runtimeHash);
  assert.equal(runtimeGate.runtimeDescriptor.executableRuleAtomCount, EXPECTED_CURRENT.executableRuleAtoms);
  assert.equal(runtimeGate.runtimeDescriptor.nonExecutableRuleAtomCount, 331);
  assert.deepEqual(runtimeGate.runtimeDescriptor.executorManifest.map((entry) => (
    `${entry.executorId}@${entry.executorVersion}`
  )), EXPECTED_EXECUTORS);
  assert.equal(runtimeGate.runtimeDescriptor.legacyCompatibilityUsed, false);
  assert.equal(runtimeGate.runtimeDescriptor.productionRoomEligible, false);
});

await check("relationship_graph_declared_scope_is_closed_without_claiming_global_completion", () => {
  assert.equal(
    current.graph.graphHash,
    EXPECTED_CURRENT.relationshipGraphHash,
  );
  const relationshipAudit = current.graphAudit;
  assert.equal(relationshipAudit.valid, true);
  assert.equal(relationshipAudit.declaredScopesValid, true);
  assert.equal(relationshipAudit.counts.nodes, 10500);
  assert.equal(relationshipAudit.counts.edges, 30252);
  assert.equal(
    relationshipAudit.counts.declaredStateContractExecutors,
    EXPECTED_CURRENT.declaredStateContractExecutors,
  );
  assert.equal(
    relationshipAudit.counts.stateContractMissingExecutors,
    EXPECTED_CURRENT.stateContractMissingExecutors,
  );
  assert.equal(relationshipAudit.globalRelationshipCoverageComplete, false);
  assert.equal(relationshipAudit.productionEligible, false);
  assert.deepEqual(relationshipAudit.gaps.executorConsumerGaps, []);
  assert.deepEqual(relationshipAudit.coverageDebtCodes, [
    "ACTIONABLE_RULE_ATOMS_REMAIN",
  ]);
});

await check("rule_skill_harness_and_training_promotion_remain_closed", () => {
  assert(reports.every(({ report }) => report.trainingTruth !== true));
  assert.equal(current.trainingTruth, false);
  assert.equal(current.slice.rulesEligible, false);
  assert.deepEqual(current.slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(current.slice.ctx2skill.promotions, []);
  assert.deepEqual(current.slice.harness.trainingTraceCandidates, []);
  assert.equal(
    historicalOptionalStimpackMove.authorityFixture.actionSchemaVersion,
    "hybrid_legal_space_v12",
  );
  assert.equal(
    historicalMultiEnemyStimpack.authorityFixture.actionSchemaVersion,
    "hybrid_legal_space_v17",
  );
  assert.equal(
    current.slice.historicalCompatibility.actionSchemaVersion,
    "hybrid_legal_space_v33",
  );
  assert.equal(runtimeGate.runtimeDescriptor.ctx2skillPromotionEligible, false);
  assert.equal(runtimeGate.runtimeDescriptor.trainingTruth, false);
  assert.equal(runtimeGate.runtimeDescriptor.productionRoomEligible, false);
});

await check("development_tranche_source_lock_is_current_offline_and_rule_neutral", () => {
  assert.equal(developmentTranche.sourceLock.lockHash,
    "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
  assert.equal(developmentTranche.sourceLock.snapshotHash,
    "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105");
  assert.equal(developmentTranche.sourceLock.normalizedDatasetHash,
    "b2579b83bb9a77b6119730009725a34d4e828d92d302248243bab33863551067");
  assert.equal(developmentTranche.sourceLock.sameVersionDrift.officialProductChanged, false);
  assert.equal(developmentTranche.sourceLock.sameVersionDrift.officialRuleProseChanged, false);
  assert.equal(developmentTranche.sourceLock.sameVersionDrift.canAffectRules, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_ticket_11_rule_atom_foundation_aggregate_verifier_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  evidenceDenominator: {
    baseReports: EXPECTED_BASE_REPORTS,
    baseAssertions: EXPECTED_BASE_ASSERTIONS,
    aggregateReports: EXPECTED_BASE_REPORTS + 1,
    aggregateAssertions: EXPECTED_BASE_ASSERTIONS + acceptance.length,
  },
  current: EXPECTED_CURRENT,
  historicalV4: EXPECTED_HISTORICAL_V4,
  official: EXPECTED_OFFICIAL_LATEST,
  officialLatest: EXPECTED_OFFICIAL_LATEST,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length ? "aggregate_gate_failed" : "current_and_historical_reports_cross_checked",
    promotions: [],
    blocks: ["remaining_217_actionable_rule_atoms_not_executable"],
    remainingRuleGaps: 217,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt", "rule_skill_builder_prompt"],
    harnessToolsCalled: ["read_rules_verdict", "list_legal_actions", "preview_action", "apply_action_after_user_confirmation", "replay_room"],
    uiTraceEvidence: "aggregate_contract_evidence_only_device_ui_pending",
    agentDecisionEvidence: "current_catalogue_and_executor_manifest_cross_checked",
    memoryTraceEvidence: "no_skill_or_memory_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "base_report_or_assertion_denominator_drift_fails_the_foundation_gate",
      "current_historical_source_runtime_or_training_gate_drift_fails_closed",
    ],
    userVisibleChecks: [
      "foundation_totals_are_machine_counted",
      "old_rules_display_and_current_rules_runtime_are_both_preserved",
    ],
  },
  rulesTruth: "cross_report_evidence_only",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, REPORT_NAME), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  evidenceDenominator: report.evidenceDenominator,
  failures,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
