import { supabase } from '../supabase/client.js';

export async function insertCommand({ userId, command, payload, issuedBy, idempotencyKey }) {
  if (!userId) return false;
  
  const { error } = await supabase.from('session_commands').insert({
    user_id: userId,
    command,
    payload,
    issued_by: issuedBy,
    idempotency_key: idempotencyKey
  });

  if (error) {
    if (error.code === '23505') { // Unique constraint violation (idempotency key)
      console.log('Command already exists, skipping duplicate:', idempotencyKey);
      return true; // Consider successful since it's already there
    }
    console.error('Error inserting command:', error);
    return false;
  }
  return true;
}

export async function listPendingCommands(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('session_commands')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('issued_at', { ascending: true });
    
  if (error) {
    console.error('Error listing pending commands:', error);
    return [];
  }
  return data;
}

export async function markCommandProcessed(userId, commandId) {
  if (!userId || !commandId) return false;
  const { error } = await supabase
    .from('session_commands')
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('id', commandId)
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error marking command processed:', error);
    return false;
  }
  return true;
}
