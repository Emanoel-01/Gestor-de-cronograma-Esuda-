import { NextResponse } from 'next/server';
import { sendDailyLeadsSummary } from '@/lib/mail-notifications';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await sendDailyLeadsSummary();
    return NextResponse.json({
      success: true,
      message: `Resumo diário enviado com sucesso para ${result.count} lead(s).`,
      mailId: result.mailId,
      totalLeads: result.count,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Erro na rota de resumo diário de leads:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Falha ao gerar resumo diário de leads'
    }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
