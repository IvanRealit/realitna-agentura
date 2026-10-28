/** Adapter boundary only. No undocumented REALVIA/backOFFICE API is called. */
export interface CrmAdapter {
 name: string;
 exportLead(leadId: string): Promise<{ externalId: string }>;
}
export class UnconfiguredCrmAdapter implements CrmAdapter {
 name='REALVIA / backOFFICE (not configured)';
 async exportLead(): Promise<{externalId:string}> { throw new Error('Official API documentation, credentials, data mapping and consent review are required.'); }
}
