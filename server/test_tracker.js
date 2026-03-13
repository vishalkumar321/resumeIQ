import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_URL = 'http://localhost:5000/api';
// We need a valid token to test tracking as it's protected by verifyUser
// Since I have the user's credentials from before, I'll manually login first to get a token.

async function testTracker() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'vishalkumargupta4546@gmail.com',
            password: 'Vishal@4518'
        });
        const token = loginRes.data.data.token;
        console.log('Login successful.');

        const config = {
            headers: { Authorization: `Bearer ${token}` }
        };

        console.log('Testing GET /api/tracker/stats...');
        try {
            const statsRes = await axios.get(`${API_URL}/tracker/stats`, config);
            console.log('Stats:', statsRes.data);
        } catch (e) {
            console.error('Stats failed:', e.response?.data || e.message);
        }

        console.log('\nTesting POST /api/tracker...');
        try {
            const createRes = await axios.post(`${API_URL}/tracker`, {
                company_name: 'DebugCorp',
                role_title: 'Backend Fixer',
                status: 'applied'
            }, config);
            console.log('Create success:', createRes.data);
        } catch (e) {
            console.error('Create failed:', e.response?.data || e.message);
        }

    } catch (err) {
        console.error('General error:', err.response?.data || err.message);
    }
}

testTracker();
