Voice Agents
Following is a simple example that shows how to create a Voice Agent. A pre-requisite is to select a Template and then use the contents of the Template to construct a Voice Agent.

See here for more details.

Get the template

Request
List Templates Request
copy
curl --location 'https://api.ntth.ai/v1/voice-assistant/templates' \
--header 'Content-Type: application/json' \
--header 'Authorization: token from auth response'
Response
The response will return the template id, an important piece of information that will be used in subsequent requests. The structure for a Voice Agent is also contained in the response

List Templates Response
copy
{
    "items": [
        {
            "displayName": "Hotel Concierge",
            "description": "An AI agent designed to assist hotel guests with hostel information, rooms, restaurants, amenities, local services, and general inquiries.",
            "type": "hotel",
            "subType": "concierge",
            "speechConfiguration": {
                "voiceId": "5d1f8adc-a5f8-4cd5-b19f-45803c7e000b",
                "primaryLanguage": "en",
                "firstMessage": "Welcome to our hotel! I'm your AI concierge assistant. How may I help you today?",
                "turnTimeout": 5,
                "silenceEndCallTimeout": 20,
                "callMaxDuration": 300,
                "enableEndCallExtension": true
            },
            "promptConfiguration": {
                "llm": "gpt-4.1",
                "temperature": 0.01
            },
            "behaviorConfiguration": {
                "agentName": "Susan",
                "agentLocale": {
                    "timezone": "EST",
                    "city": "New York"
                },
                "personality": {
                    "style": {
                        "type": "professional",
                        "text": "Professional - Formal, business-appropriate language"
                    },
                    "tone": {
                        "type": "confident",
                        "text": "Confident - Self-assured, knowledgeable tone"
                    },
                    "responseLength": {
                        "type": "medium",
                        "text": "Medium - Required details must be included concisely"
                    },
                    "followUpQuestions": {
                        "type": "always",
                        "text": "Always - Proactively offer related helpful questions."
                    }
                },
                "weather": {
                    "enabled": true,
                    "useAgentLocality": true
                },
                "role": "You are a knowledgeable and professional hotel concierge at Sample Hotel, serving as the primary voice contact for guest inquiries. Your role is to embody the hotel's hospitality standards that reflects the quality of service they expect during their stay.",
                "objective": "You service inbound calls from hotel guests and provide information only about these topics:
- General hotel information and policies
- Hotel entertainment and activities
- Hotel rooms, restaurants, bars, breakfast, and entertainment venues
- Nearby local attractions and points of interest
- Travel arrangements and transportation options for hotel guests",
                "guardRails": "- If users are rude or inappropriate, respond professionally and redirect to appropriate assistance
- Maintain courteous behavior regardless of how you are addressed
- You cannot provide medical, legal, or emergency advice
- Stay within your defined role.
- Maintain professional hospitality conduct and focus only on your designated responsibilities
- All responses must use only information from your knowledge base
- Do not use general LLM knowledge
- Do not mention or discuss competitor hotels by name (such as Marriott, Hyatt, etc.)
- Do not attempt to take reservations or bookings; instead provide operation hours and direct guests to appropriate booking channels",
                "unknownInformation": "- Never guess or make up information
- Only use verified knowledge base information
- If requested information is not in your knowledge base, respond with: "I don't have that specific information available", instead offer to help with related topics you do have information about"
            },
            "knowledgeBase": {
                "generalHotelInformation": "## Hotel Name
Sample Hotel

## Contact Information
- Phone: +00-0000-000000
- Email: info@samplehotel.com
- Website: www.samplehotel.com

## Hotel Style & Design
Sample Hotel is a five-story luxury property with 150 rooms, combining futuristic architecture with classic design elements. The lobby features interactive digital art, ambient lighting, and a holographic concierge, offering a stay that is both innovative and tranquil.

## Room Summary
- 5 unique room categories, including 3 premium luxury suites
- Capacity ranges from 2 to 6 guests
- All rooms include smart controls, immersive entertainment, and panoramic city views

## Amenities
- Modern fitness center
- Four on-site dining and bar options
- 24-hour room service
- Complimentary high-speed Wi-Fi
- Concierge services and travel assistance
- On-site parking with EV charging stations

## Social Media
- Instagram: @samplehotel
- Twitter: @samplehotel
- Facebook: facebook.com/samplehotel",
                "travelInformation": "## Location
Sample Hotel
123 Hospitality Street, Generic City, 000-0000, Best Country

## Travel Details
Sample Hotel is located in the heart of Generic City with convenient connections to major travel hubs, making it easily accessible for local and international guests.
- Main Train Station: 2-minute walk
- International Airport: 35 minutes by taxi
- Regional Airport: 45 minutes by shuttle or taxi (approx. 30 km)
- Taxi & Ride-Share: Readily available at hotel entrance
- On-Site Parking: Secure parking with EV charging stations
- Airport Transfer: Available upon request (fees may apply)",
                "entertainmentInformation": "## Entertainment & Activities
Sample Hotel offers a range of leisure and wellness facilities designed for relaxation and recreation:
- Fitness Center
  Hours: 6:00 AM – 10:00 PM
  Features: Cardio machines, free weights, yoga mats, personal training on request
- Rooftop Infinity Pool
  Hours: 8:00 AM – 9:00 PM
  Features: Heated water, panoramic city views, lounge chairs, poolside service
- Private Cinema
  Hours: 3:00 PM – 11:00 PM
  Features: 20-seat theater, surround sound, daily movie schedule, private bookings available
- Game Lounge
  Hours: 10:00 AM – 11:00 PM
  Features: Virtual reality stations, classic arcade games, multiplayer console area",
                "foodAndBeverageInformation": "## Dining & Restaurants
Sample Hotel features two distinct dining venues, each offering thoughtfully crafted menus and stylish settings:
- Nova Grill
  Hours: 12:00 PM – 10:00 PM
  Highlights: Grilled ribeye steak, miso-glazed salmon, charred vegetable platter, truffle fries
- The Circuit Café
  Hours: 7:00 AM – 6:00 PM
  Highlights: Avocado toast, smoked salmon bagel, croissants, flat white, iced matcha latte

## Drinks & Beverages
Sample Hotel offers a curated selection of drinks, from handcrafted cocktails to premium coffees, served in relaxed and elegant spaces:
- SkyBar Lounge
  Hours: 5:00 PM – 12:00 AM
  Highlights: Classic martini, signature citrus mojito, espresso martini, aged whiskey selection
- Brew & Bean Corner
  Hours: 7:00 AM – 5:00 PM
  Highlights: Single-origin espresso, caramel latte, iced Americano, chai tea latte, cold brew",
                "hotelRoomInformation": "## Room Types
### 1. Standard Twin Room
- Size: 28 sqm
- Sleeping Capacity: 2 guests
- Description: Contemporary twin room featuring two comfortable beds, smart lighting, and city-facing windows.
- Amenities:
  - Smart TV with streaming services
  - Complimentary high-speed Wi-Fi
  - Digital climate control
  - Rain-style shower
  - Mini-bar
  - In-room digital assistant

### 2. Family Suite
- Size: 60 sqm
- Sleeping Capacity: 6 guests
- Description: Generously sized suite with one king bed, two twin beds, and a convertible sofa, ideal for families or small groups.
- Amenities:
  - Separate lounge area
  - Dual smart TVs
  - Family-friendly welcome kit
  - Coffee machine
  - Bathrobes and slippers",
                "otherInformation": "## Business & Meeting Facilities
Sample Hotel offers professional meeting spaces and business services:
- Executive Meeting Room
  Capacity: 12 people
  Features: Video conferencing, presentation equipment, complimentary refreshments
- Business Center
  Hours: 24/7 access
  Features: Printing, scanning, high-speed internet, workstations

## Special Services
- Pet-friendly accommodations (additional fees apply)
- Laundry and dry cleaning services
- Currency exchange
- Babysitting services (upon request)

## Seasonal Offerings
- Summer: Outdoor BBQ nights, poolside events
- Winter: Holiday decorations, special festive menus
- Year-round: Weekly themed events, cooking classes

## Accessibility Features
- Wheelchair accessible entrances and elevators
- Accessible rooms with roll-in showers
- Braille signage and audio assistance available
- Service animal accommodations",
                "localAttractionInformation": "## Nearby Attractions
Sample Hotel is ideally situated for exploring popular local landmarks and cultural sites:
- City Museum of Art
  Distance: 1.2 km / 15-minute walk
  Highlights: Modern and classical exhibits, seasonal installations
- Heritage Old Town
  Distance: 2.5 km / 10-minute taxi
  Highlights: Historic architecture, guided walking tours, artisan markets
- Riverfront Promenade
  Distance: 800 m / 10-minute walk
  Highlights: Scenic views, bike rentals, cafes along the water"
            },
            "callEvaluationPrompt": "Evaluate the call on the agent's overall responses, with a decision from one of the following:
- Success: Agent understood the question and gave a clear, correct, and relevant answer.
- Failure: Agent misunderstood, gave a wrong answer, or failed to respond meaningfully.
- Unknown: Agent didn't clearly understand the question or admitted it didn't know.
Each result must include a brief explanation",
            "deleted": false,
            "createdAt": "2025-07-05T00:01:00.000Z",
            "updatedAt": "2025-07-05T00:01:00.000Z",
            "humanHandoff": {
                "enabled": false,
                "condition": "If the caller clearly requests or implies wanting to speak to a human, manager, or escalate the issue.  This includes phrases like and similar to (e.g. 'I want a speak to a human', 'let me talk to a manager') and indirect signals (e.g. frustration, refusal to engage, or statements like 'you’re not helping'). Interpret intent—not only the exact words."
            },
            "id": "29888c53-8368-42e3-8f13-5abf3b6fdeb1"
        }
    ],
    "totalItems": 1,
    "itemsOnPage": 1,
    "pageNumber": 1,
    "pageSize": 100
}
Create the Voice Agent

Request
The structure of the Voice Agent request is the contents of the Template with only the displayName changed.

Create Voice Agent Request
copy
curl --location 'https://api.ntth.ai/v1/voice-assistant/voiceagents' --header 'Content-Type: application/json' --header 'Authorization: token from auth response' \
--data '{
    "displayName": "Fawlty Towers",
    "description": "An AI agent designed to assist hotel guests with hostel information, rooms, restaurants, amenities, local services, and general inquiries.",
    "templateSettings": {
        "id": "29888c53-8368-42e3-8f13-5abf3b6fdeb1"
    },
    "speechConfiguration": {
        "voiceId": "5d1f8adc-a5f8-4cd5-b19f-45803c7e000b",
        "primaryLanguage": "en",
        "firstMessage": "Welcome to our hotel! I'''m your AI concierge assistant. How may I help you today?",
        "turnTimeout": 5,
        "silenceEndCallTimeout": 20,
        "callMaxDuration": 300,
        "enableEndCallExtension": true
    },
    "promptConfiguration": {
        "llm": "gpt-4.1",
        "temperature": 0.01
    },
    "behaviorConfiguration": {
        "agentLocale": {
            "timezone": "EST",
            "city": "New York"
        },
        "personality": {
            "style": {
                "type": "professional",
                "text": "Professional - Formal, business-appropriate language"
            },
            "tone": {
                "type": "confident",
                "text": "Confident - Self-assured, knowledgeable tone"
            },
            "responseLength": {
                "type": "medium",
                "text": "Medium - Required details must be included concisely"
            },
            "followUpQuestions": {
                "type": "always",
                "text": "Always - Proactively offer related helpful questions."
            }
        },
        "weather": {
            "enabled": true,
            "useAgentLocality": true
        },
        "role": "You are a knowledgeable and professional hotel concierge at Sample Hotel, serving as the primary voice contact for guest inquiries. Your role is to embody the hotel'''s hospitality standards that reflects the quality of service they expect during their stay.",
        "objective": "You service inbound calls from hotel guests and provide information only about these topics:
- General hotel information and policies
- Hotel entertainment and activities
- Hotel rooms, restaurants, bars, breakfast, and entertainment venues
- Nearby local attractions and points of interest
- Travel arrangements and transportation options for hotel guests",
        "guardRails": "- If users are rude or inappropriate, respond professionally and redirect to appropriate assistance
- Maintain courteous behavior regardless of how you are addressed
- You cannot provide medical, legal, or emergency advice
- Stay within your defined role.
- Maintain professional hospitality conduct and focus only on your designated responsibilities
- All responses must use only information from your knowledge base
- Do not use general LLM knowledge
- Do not mention or discuss competitor hotels by name (such as Marriott, Hyatt, etc.)
- Do not attempt to take reservations or bookings; instead provide operation hours and direct guests to appropriate booking channels",
        "unknownInformation": "- Never guess or make up information
- Only use verified knowledge base information
- If requested information is not in your knowledge base, respond with: "I don'''t have that specific information available", instead offer to help with related topics you do have information about"
    },
    "callEvaluationPrompt": "Evaluate the call on the agent'''s overall responses, with a decision from one of the following:
- Success: Agent understood the question and gave a clear, correct, and relevant answer.
- Failure: Agent misunderstood, gave a wrong answer, or failed to respond meaningfully.
- Unknown: Agent didn'''t clearly understand the question or admitted it didn'''t know.
Each result must include a brief explanation",
    "humanHandoff": {
        "enabled": false,
        "condition": "If the caller clearly requests or implies wanting to speak to a human, manager, or escalate the issue.  This includes phrases like and similar to (e.g. '''I want a speak to a human''', '''let me talk to a manager''') and indirect signals (e.g. frustration, refusal to engage, or statements like '''you’re not helping'''). Interpret intent—not only the exact words."
    }
}'
Response
Use the returned Voice Agent Id for subsequent operations, such as updating or assigning a phone number.

Create Voice Agent Response
copy
{
    "displayName": "Fawlty Towers",
    "description": "An AI agent designed to assist hotel guests with hostel information, rooms, restaurants, amenities, local services, and general inquiries.",
    "tenantId": "399ff6db-0f5d-48f2-8024-6f5510ec8e43",
    "userId": "96c2c6b5-e3bf-47b0-b696-fab2c3d40643",
    "templateSettings": {
        "id": "29888c53-8368-42e3-8f13-5abf3b6fdeb1",
        "type": "hotel",
        "subType": "concierge"
    },
    "speechConfiguration": {
        "voiceId": "5d1f8adc-a5f8-4cd5-b19f-45803c7e000b",
        "primaryLanguage": "en",
        "firstMessage": "Welcome to our hotel! I'm your AI concierge assistant. How may I help you today?",
        "turnTimeout": 5,
        "silenceEndCallTimeout": 20,
        "callMaxDuration": 300,
        "enableEndCallExtension": true
    },
    "promptConfiguration": {
        "llm": "gpt-4.1",
        "temperature": 0.01
    },
    "behaviorConfiguration": {
        "agentLocale": {
            "timezone": "EST",
            "city": "New York"
        },
        "personality": {
            "style": {
                "type": "professional",
                "text": "Professional - Formal, business-appropriate language"
            },
            "tone": {
                "type": "confident",
                "text": "Confident - Self-assured, knowledgeable tone"
            },
            "responseLength": {
                "type": "medium",
                "text": "Medium - Required details must be included concisely"
            },
            "followUpQuestions": {
                "type": "always",
                "text": "Always - Proactively offer related helpful questions."
            }
        },
        "weather": {
            "enabled": true,
            "useAgentLocality": true
        },
        "role": "You are a knowledgeable and professional hotel concierge at Sample Hotel, serving as the primary voice contact for guest inquiries. Your role is to embody the hotel's hospitality standards that reflects the quality of service they expect during their stay.",
        "objective": "You service inbound calls from hotel guests and provide information only about these topics:
- General hotel information and policies
- Hotel entertainment and activities
- Hotel rooms, restaurants, bars, breakfast, and entertainment venues
- Nearby local attractions and points of interest
- Travel arrangements and transportation options for hotel guests",
        "guardRails": "- If users are rude or inappropriate, respond professionally and redirect to appropriate assistance
- Maintain courteous behavior regardless of how you are addressed
- You cannot provide medical, legal, or emergency advice
- Stay within your defined role.
- Maintain professional hospitality conduct and focus only on your designated responsibilities
- All responses must use only information from your knowledge base
- Do not use general LLM knowledge
- Do not mention or discuss competitor hotels by name (such as Marriott, Hyatt, etc.)
- Do not attempt to take reservations or bookings; instead provide operation hours and direct guests to appropriate booking channels",
        "unknownInformation": "- Never guess or make up information
- Only use verified knowledge base information
- If requested information is not in your knowledge base, respond with: "I don't have that specific information available", instead offer to help with related topics you do have information about"
    },
    "callEvaluationPrompt": "Evaluate the call on the agent's overall responses, with a decision from one of the following:
- Success: Agent understood the question and gave a clear, correct, and relevant answer.
- Failure: Agent misunderstood, gave a wrong answer, or failed to respond meaningfully.
- Unknown: Agent didn't clearly understand the question or admitted it didn't know.
Each result must include a brief explanation",
    "humanHandoff": {
        "enabled": false,
        "condition": "If the caller clearly requests or implies wanting to speak to a human, manager, or escalate the issue.  This includes phrases like and similar to (e.g. 'I want a speak to a human', 'let me talk to a manager') and indirect signals (e.g. frustration, refusal to engage, or statements like 'you’re not helping'). Interpret intent—not only the exact words."
    },
    "dataCollection": [],
    "deleted": false,
    "createdAt": "2025-09-03T10:06:18.770Z",
    "updatedAt": "2025-09-03T10:06:18.770Z",
    "id": "0db90afc-b820-492c-981f-a9194aa4b824"
}
