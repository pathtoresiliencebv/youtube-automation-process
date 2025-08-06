require('dotenv').config({ path: '.env.local' })
const { Client } = require('pg')

async function addTestVideoIdeas() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    await client.connect()
    console.log('Connected to Neon database')

    // Get the test user ID
    const userResult = await client.query('SELECT id FROM users WHERE email = $1', ['pathtoresiliencebv@gmail.com'])
    
    if (userResult.rows.length === 0) {
      console.log('❌ Test user not found. Run create-test-user.js first.')
      return
    }

    const userId = userResult.rows[0].id

    // Add some test video ideas
    const testIdeas = [
      {
        title: "7 Dagelijkse Gewoontes Die Je Leven Veranderen",
        description: "Een video over krachtige gewoontes die impact hebben op persoonlijke groei"
      },
      {
        title: "Waarom Falen De Beste Leraar Is",
        description: "Een inspirerende video over hoe tegenslagen leiden tot groei"
      },
      {
        title: "De Kracht van Small Steps: Grote Verandering Door Kleine Acties",
        description: "Over hoe kleine, consistente acties tot grote transformaties leiden"
      },
      {
        title: "Mindset Shift: Van Probleem naar Oplossing Denken",
        description: "Een video over het veranderen van je perspectief op uitdagingen"
      },
      {
        title: "De 5 Minuten Regel voor Procrastinatie",
        description: "Een praktische techniek om uitstelgedrag te overwinnen"
      }
    ]

    for (const idea of testIdeas) {
      await client.query(
        `INSERT INTO video_ideas (user_id, title, description, status, created_at, updated_at) 
         VALUES ($1, $2, $3, 'pending_approval', NOW(), NOW())`,
        [userId, idea.title, idea.description]
      )
      console.log(`✅ Added: ${idea.title}`)
    }

    console.log('🎉 Test video ideas added successfully!')

  } catch (error) {
    console.error('❌ Error adding test video ideas:', error)
  } finally {
    await client.end()
  }
}

addTestVideoIdeas()