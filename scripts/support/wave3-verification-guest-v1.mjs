import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';

// A two-player lobby initially has only its creator. Exercise the same invitation
// exchange as a second player; retain the test credential only in its local room.
export async function joinWave3VerificationGuest(item,file) {
  try {return JSON.parse(await readFile(file,'utf8'));} catch(error){if(error.code!=='ENOENT')throw error;}
  const room=item.fixture.roomRuntime,roomId=item.record.roomId;
  const invited=await room.issueInvite({roomId,seatToken:item.record.credentials.human.seatToken});
  assert(invited.ok,invited.reason);
  const joined=await room.joinRoom({roomId,inviteToken:invited.invite.inviteToken});
  assert(joined.ok,joined.reason);
  await writeFile(file,JSON.stringify(joined.credential),{mode:0o600,flag:'wx'});
  return joined.credential;
}
