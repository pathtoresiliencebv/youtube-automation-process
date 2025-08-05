import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface NotificationData {
  userId: string
  userEmail: string
  userName: string
  type: 'success' | 'warning' | 'error' | 'info'
  event: string
  data: any
}

class EmailService {
  private fromEmail = process.env.FROM_EMAIL || 'noreply@contentcatalyst.com'

  async sendNotification(notification: NotificationData): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.log('Email notifications disabled: RESEND_API_KEY not configured')
        return false
      }

      const template = this.getTemplate(notification)
      
      const { data, error } = await resend.emails.send({
        from: this.fromEmail,
        to: [notification.userEmail],
        subject: template.subject,
        html: template.html,
        text: template.text,
      })

      if (error) {
        console.error('Email sending failed:', error)
        return false
      }

      console.log('Email sent successfully:', data?.id)
      return true

    } catch (error) {
      console.error('Email service error:', error)
      return false
    }
  }

  async sendBulkNotification(notifications: NotificationData[]): Promise<number> {
    let successCount = 0
    
    for (const notification of notifications) {
      const success = await this.sendNotification(notification)
      if (success) successCount++
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return successCount
  }

  private getTemplate(notification: NotificationData): EmailTemplate {
    const { type, event, data, userName } = notification
    
    switch (event) {
      case 'video_published':
        return this.getVideoPublishedTemplate(data, userName, type)
      
      case 'video_failed':
        return this.getVideoFailedTemplate(data, userName)
      
      case 'bulk_operation_completed':
        return this.getBulkOperationTemplate(data, userName)
      
      case 'system_alert':
        return this.getSystemAlertTemplate(data, userName, type)
      
      case 'youtube_connection_issue':
        return this.getYouTubeConnectionTemplate(data, userName)
      
      case 'weekly_summary':
        return this.getWeeklySummaryTemplate(data, userName)
      
      case 'quota_warning':
        return this.getQuotaWarningTemplate(data, userName)
      
      default:
        return this.getGenericTemplate(notification)
    }
  }

  private getVideoPublishedTemplate(data: any, userName: string, type: string): EmailTemplate {
    const isSuccess = type === 'success'
    const statusText = isSuccess ? 'succesvol gepubliceerd' : 'gepland voor publicatie'
    
    return {
      subject: `✅ Video ${statusText}: ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎬 Content Catalyst Engine</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${userName}!</h2>
            
            <div style="background: #f7fafc; border-left: 4px solid #48bb78; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #2d3748;">
                🎉 Je video is ${statusText}!
              </p>
            </div>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d3748;">${data.title}</h3>
              
              ${data.description ? `<p style="color: #4a5568; line-height: 1.6;">${data.description.substring(0, 200)}...</p>` : ''}
              
              <div style="margin: 15px 0;">
                ${isSuccess && data.youtubeVideoId ? `
                  <a href="https://youtube.com/watch?v=${data.youtubeVideoId}" 
                     style="background: #e53e3e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                    🔗 Bekijk op YouTube
                  </a>
                ` : ''}
              </div>
              
              <div style="font-size: 14px; color: #718096; margin-top: 15px;">
                <p><strong>Status:</strong> ${data.status}</p>
                ${data.scheduledDate ? `<p><strong>Gepland:</strong> ${new Date(data.scheduledDate).toLocaleString('nl-NL')}</p>` : ''}
                ${data.performanceScore ? `<p><strong>Performance Score:</strong> ${data.performanceScore}%</p>` : ''}
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📊 Bekijk Dashboard
              </a>
            </div>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096;">
            <p>Je ontvangt deze email omdat je geabonneerd bent op Content Catalyst Engine notificaties.</p>
            <p>© 2024 Content Catalyst Engine. Alle rechten voorbehouden.</p>
          </div>
        </div>
      `,
      text: `
Hallo ${userName}!

Je video is ${statusText}: ${data.title}

${data.description ? data.description.substring(0, 200) + '...' : ''}

Status: ${data.status}
${data.scheduledDate ? `Gepland: ${new Date(data.scheduledDate).toLocaleString('nl-NL')}` : ''}
${isSuccess && data.youtubeVideoId ? `YouTube: https://youtube.com/watch?v=${data.youtubeVideoId}` : ''}

Bekijk je dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

Content Catalyst Engine
      `
    }
  }

  private getVideoFailedTemplate(data: any, userName: string): EmailTemplate {
    return {
      subject: `❌ Video creatie mislukt: ${data.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎬 Content Catalyst Engine</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${userName}!</h2>
            
            <div style="background: #fed7d7; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #2d3748;">
                ⚠️ Er is een probleem opgetreden met je video
              </p>
            </div>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d3748;">${data.title}</h3>
              
              <div style="background: #fffaf0; border: 1px solid #fbb042; border-radius: 4px; padding: 15px; margin: 15px 0;">
                <p style="margin: 0; color: #c05621;"><strong>Foutmelding:</strong></p>
                <p style="margin: 5px 0 0 0; color: #c05621; font-family: monospace;">${data.error || 'Onbekende fout'}</p>
              </div>
              
              <div style="font-size: 14px; color: #718096; margin-top: 15px;">
                <p><strong>Status:</strong> ${data.status}</p>
                <p><strong>Retry count:</strong> ${data.retryCount || 0}</p>
                ${data.lastAttempt ? `<p><strong>Laatste poging:</strong> ${new Date(data.lastAttempt).toLocaleString('nl-NL')}</p>` : ''}
              </div>
            </div>
            
            <div style="background: #e6fffa; border: 1px solid #38b2ac; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #234e52;"><strong>💡 Wat kun je doen:</strong></p>
              <ul style="color: #234e52; margin: 10px 0 0 0;">
                <li>Controleer je API configuratie in het dashboard</li>
                <li>Probeer de video opnieuw te genereren</li>
                <li>Neem contact op met support als het probleem aanhoudt</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-right: 10px;">
                📊 Ga naar Dashboard
              </a>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: #48bb78; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                🔄 Probeer Opnieuw
              </a>
            </div>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096;">
            <p>Je ontvangt deze email omdat je geabonneerd bent op Content Catalyst Engine notificaties.</p>
          </div>
        </div>
      `,
      text: `
Hallo ${userName}!

Er is een probleem opgetreden met je video: ${data.title}

Foutmelding: ${data.error || 'Onbekende fout'}
Status: ${data.status}
Retry count: ${data.retryCount || 0}

Wat kun je doen:
- Controleer je API configuratie
- Probeer de video opnieuw te genereren
- Neem contact op met support

Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

Content Catalyst Engine
      `
    }
  }

  private getBulkOperationTemplate(data: any, userName: string): EmailTemplate {
    return {
      subject: `📋 Bulk operatie voltooid: ${data.operation}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎬 Content Catalyst Engine</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${userName}!</h2>
            
            <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #2d3748;">
                ✅ Je bulk operatie is voltooid!
              </p>
            </div>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d3748;">Operatie: ${data.operation}</h3>
              
              <div style="display: flex; justify-content: space-between; margin: 20px 0;">
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #48bb78;">${data.successful || 0}</div>
                  <div style="font-size: 12px; color: #718096;">Succesvol</div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #e53e3e;">${data.failed || 0}</div>
                  <div style="font-size: 12px; color: #718096;">Mislukt</div>
                </div>
                <div style="text-align: center; flex: 1;">
                  <div style="font-size: 24px; font-weight: bold; color: #4299e1;">${data.total || 0}</div>
                  <div style="font-size: 12px; color: #718096;">Totaal</div>
                </div>
              </div>
              
              <div style="background: #f7fafc; border-radius: 4px; padding: 10px; margin: 15px 0;">
                <p style="margin: 0; font-size: 14px; color: #4a5568;">
                  <strong>Success rate:</strong> ${Math.round(((data.successful || 0) / (data.total || 1)) * 100)}%
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📊 Bekijk Resultaten
              </a>
            </div>
          </div>
          
          <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096;">
            <p>Content Catalyst Engine Bulk Operatie Rapport</p>
          </div>
        </div>
      `,
      text: `
Hallo ${userName}!

Je bulk operatie is voltooid!

Operatie: ${data.operation}
Succesvol: ${data.successful || 0}
Mislukt: ${data.failed || 0}
Totaal: ${data.total || 0}
Success rate: ${Math.round(((data.successful || 0) / (data.total || 1)) * 100)}%

Bekijk resultaten: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

Content Catalyst Engine
      `
    }
  }

  private getSystemAlertTemplate(data: any, userName: string, type: string): EmailTemplate {
    const alertIcon = type === 'error' ? '🚨' : type === 'warning' ? '⚠️' : 'ℹ️'
    const alertColor = type === 'error' ? '#e53e3e' : type === 'warning' ? '#fbb042' : '#4299e1'
    
    return {
      subject: `${alertIcon} Systeem Alert: ${data.title || 'Belangrijke melding'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${alertColor}; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">${alertIcon} Systeem Alert</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${userName},</h2>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-left: 4px solid ${alertColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d3748;">${data.title || 'Systeem Melding'}</h3>
              <p style="color: #4a5568; line-height: 1.6;">${data.message}</p>
              
              ${data.details ? `
                <div style="background: #f7fafc; border-radius: 4px; padding: 15px; margin: 15px 0;">
                  <p style="margin: 0; font-size: 14px; color: #4a5568;">${data.details}</p>
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin" 
                 style="background: ${alertColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                🔧 Admin Panel
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
${alertIcon} SYSTEEM ALERT

Hallo ${userName},

${data.title || 'Systeem Melding'}

${data.message}

${data.details ? `Details: ${data.details}` : ''}

Admin Panel: ${process.env.NEXT_PUBLIC_APP_URL}/admin
      `
    }
  }

  private getYouTubeConnectionTemplate(data: any, userName: string): EmailTemplate {
    return {
      subject: `🔗 YouTube verbinding vereist actie`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #e53e3e; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🔗 YouTube Verbinding</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${userName}!</h2>
            
            <div style="background: #fffaf0; border-left: 4px solid #fbb042; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #c05621;">
                ⚠️ Je YouTube verbinding heeft aandacht nodig
              </p>
            </div>
            
            <p style="color: #4a5568; line-height: 1.6;">${data.message}</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: #e53e3e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                🔧 Verbinding Herstellen
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
YouTube Verbinding Vereist Actie

Hallo ${userName}!

Je YouTube verbinding heeft aandacht nodig.

${data.message}

Herstel verbinding: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
      `
    }
  }

  private getWeeklySummaryTemplate(data: any, userName: string): EmailTemplate {
    return {
      subject: `📊 Wekelijks overzicht - ${data.week}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">📊 Wekelijks Overzicht</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.week}</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${userName}!</h2>
            
            <p style="color: #4a5568;">Hier is je wekelijkse samenvatting van Content Catalyst Engine:</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #48bb78;">${data.videosCreated || 0}</div>
                <div style="font-size: 12px; color: #718096;">Video's Gemaakt</div>
              </div>
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #e53e3e;">${data.videosPublished || 0}</div>
                <div style="font-size: 12px; color: #718096;">Gepubliceerd</div>
              </div>
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #4299e1;">${data.totalViews || 0}</div>
                <div style="font-size: 12px; color: #718096;">Totaal Views</div>
              </div>
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #9f7aea;">${data.avgPerformance || 0}%</div>
                <div style="font-size: 12px; color: #718096;">Gem. Performance</div>
              </div>
            </div>
            
            ${data.topVideo ? `
              <div style="background: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2d3748;">🏆 Top Presteerder deze Week</h3>
                <p style="font-weight: bold; color: #4a5568;">${data.topVideo.title}</p>
                <p style="color: #718096; font-size: 14px;">${data.topVideo.views} views • ${data.topVideo.likes} likes</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📈 Bekijk Volledige Analytics
              </a>
            </div>
          </div>
        </div>
      `,
      text: `
📊 WEKELIJKS OVERZICHT - ${data.week}

Hallo ${userName}!

Video's Gemaakt: ${data.videosCreated || 0}
Gepubliceerd: ${data.videosPublished || 0}
Totaal Views: ${data.totalViews || 0}
Gemiddelde Performance: ${data.avgPerformance || 0}%

${data.topVideo ? `
Top Presteerder: ${data.topVideo.title}
${data.topVideo.views} views • ${data.topVideo.likes} likes
` : ''}

Volledige analytics: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
      `
    }
  }

  private getQuotaWarningTemplate(data: any, userName: string): EmailTemplate {
    return {
      subject: `⚠️ API Quota waarschuwing - ${data.service}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #fbb042; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">⚠️ Quota Waarschuwing</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${userName}!</h2>
            
            <div style="background: #fffaf0; border-left: 4px solid #fbb042; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #c05621;">
                Je ${data.service} API quota is bijna bereikt
              </p>
            </div>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                  <span style="color: #4a5568;">Gebruikt:</span>
                  <span style="font-weight: bold; color: #2d3748;">${data.used}/${data.limit}</span>
                </div>
                <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                  <div style="background: ${data.percentage > 90 ? '#e53e3e' : data.percentage > 75 ? '#fbb042' : '#48bb78'}; height: 100%; width: ${data.percentage}%;"></div>
                </div>
                <div style="text-align: right; font-size: 12px; color: #718096; margin-top: 5px;">
                  ${data.percentage}%
                </div>
              </div>
              
              <p style="color: #4a5568; font-size: 14px;">
                Reset datum: ${new Date(data.resetDate).toLocaleDateString('nl-NL')}
              </p>
            </div>
            
            <div style="background: #e6fffa; border: 1px solid #38b2ac; border-radius: 4px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #234e52;"><strong>💡 Aanbevelingen:</strong></p>
              <ul style="color: #234e52; margin: 10px 0 0 0;">
                <li>Overweeg je video productie te beperken</li>
                <li>Upgrade je API plan indien nodig</li>
                <li>Monitor je gebruik in het dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      `,
      text: `
⚠️ QUOTA WAARSCHUWING

Hallo ${userName}!

Je ${data.service} API quota is bijna bereikt.

Gebruikt: ${data.used}/${data.limit} (${data.percentage}%)
Reset datum: ${new Date(data.resetDate).toLocaleDateString('nl-NL')}

Aanbevelingen:
- Beperk video productie
- Upgrade API plan
- Monitor gebruik in dashboard

Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
      `
    }
  }

  private getGenericTemplate(notification: NotificationData): EmailTemplate {
    return {
      subject: `🔔 ${notification.event}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">🎬 Content Catalyst Engine</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748;">Hallo ${notification.userName}!</h2>
            <p style="color: #4a5568;">Je hebt een nieuwe notificatie ontvangen:</p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2d3748;">${notification.event}</h3>
              <pre style="background: #f7fafc; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 12px;">
${JSON.stringify(notification.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      `,
      text: `
Hallo ${notification.userName}!

Nieuwe notificatie: ${notification.event}

Data: ${JSON.stringify(notification.data, null, 2)}

Content Catalyst Engine
      `
    }
  }
}

export const emailService = new EmailService()