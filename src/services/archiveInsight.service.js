import { appState } from '../state.js';
import { supabase } from '../supabase/client.js';
import { savePreferences } from '../repositories/preference.repository.js';

export async function generateArchiveInsight(forceRefresh = false) {
  const user = appState.auth.user;
  if (!user) return null;

  // For V12 MVP, we will try to call a Supabase Edge Function named 'generate-insight'
  // If it fails or is not deployed, we fallback to a simple local statistical insight.
  
  if (!forceRefresh && appState.prefs && appState.prefs.lastInsightDate) {
    const today = new Date().toDateString();
    if (appState.prefs.lastInsightDate === today && appState.prefs.lastInsightReport) {
      return appState.prefs.lastInsightReport;
    }
  }

  let report = null;

  try {
    const { data, error } = await supabase.functions.invoke('generate-insight', {
      body: { history: appState.history.slice(-50) } // Send last 50 history items
    });
    
    if (error) throw error;
    if (data && data.report) {
      report = data.report;
    }
  } catch (err) {
    console.warn('Edge function failed or not available, using fallback insight generator.', err);
    report = generateFallbackInsight();
  }

  // Cache it in preferences
  if (appState.prefs) {
    appState.prefs.lastInsightDate = new Date().toDateString();
    appState.prefs.lastInsightReport = report;
    // update preferences (fire and forget)
    savePreferences(user.id, appState.prefs);
  }

  return report;
}

function generateFallbackInsight() {
  const history = appState.history || [];
  if (history.length === 0) {
    return "No focus data available yet. Start a session to generate insights.";
  }

  let totalMins = 0;
  let partials = 0;
  history.forEach(h => {
    totalMins += Math.round(h.actualSeconds / 60);
    if (h.systemNote && h.systemNote.includes('partial')) partials++;
  });

  const avgMins = Math.round(totalMins / history.length);
  const completionRate = Math.round(((history.length - partials) / history.length) * 100);

  return `### SYSTEM ANALYSIS
You have completed ${history.length} focus sessions, totaling ${totalMins} minutes.
Average session duration: ${avgMins} minutes.
Completion fidelity: ${completionRate}%.
Signal stability is ${completionRate > 80 ? 'OPTIMAL' : 'FLUCTUATING'}. Maintain current ritual parameters.`;
}
