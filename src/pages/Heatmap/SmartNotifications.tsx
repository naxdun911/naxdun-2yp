import React from 'react';
import { MessageCircle, Bell, ExternalLink, Clock } from 'lucide-react';

const SmartNotifications: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-600 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Smart Notifications</h2>
              <p className="text-blue-100 mt-1">Get instant alerts about less crowded buildings</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 rounded-xl p-3">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="text-right">
              <div className="text-white font-medium">Telegram Bot</div>
              <div className="text-blue-100 text-sm">Real-time updates</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Get Started Section - Left Side */}
          <div className="flex flex-col justify-center">
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-6 border border-gray-200">
              <div className="text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </div>
                
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Get Started Now</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Join hundreds of users who are already finding the best spots on campus!
                  </p>
                </div>

                {/* Main CTA Button */}
                <a
                  href="https://t.me/PeraVerse_Crowd_Management_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Start Telegram Bot</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Quick Start Steps */}
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="text-left space-y-2">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Quick Start:</div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">1</span>
                      <span>Click the button above</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">2</span>
                      <span>Send <code className="bg-gray-100 px-1 rounded">/start</code> to the bot</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center font-bold">3</span>
                      <span>Get instant notifications!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Description and Features - Right Side */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                PeraVerse Crowd Management Bot
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Stay informed about building occupancy levels with our Telegram bot. 
                Get notified every 10 seconds where the occupancy is less than 40% of capacity.
                Also you can check the status of all buildings anytime by sending the <code className="bg-gray-100 px-1 rounded">/status</code> command.
                Perfect for you to avoid crowded places.
              </p>
            </div>

            {/* Command Reference */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-700 mb-3">Available Commands:</div>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="flex justify-between items-center">
                    <code className="bg-white px-2 py-1 rounded border">/start</code>
                    <span className="text-gray-600">Begin receiving notifications</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="bg-white px-2 py-1 rounded border">/status</code>
                    <span className="text-gray-600">Check all buildings status</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="bg-white px-2 py-1 rounded border">/stop</code>
                    <span className="text-gray-600">Unsubscribe from notifications</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <code className="bg-white px-2 py-1 rounded border">/help</code>
                    <span className="text-gray-600">Get help and information</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Info Banner */}
        <div className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-800 font-medium">Bot Status:</span>
              <span className="text-emerald-700 font-semibold">Active & Monitoring</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Updates every 10 seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartNotifications;
