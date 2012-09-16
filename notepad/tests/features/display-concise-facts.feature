Feature: Display concise facts
  As a user of notepad
  I want to see a concise view of facts without duplicates
  So that I focus on their meaning

  Scenario: Display a concept the first time
	Given an empty container
	Given a concept
	Given facts about that concept
	When I add a concept to it
	Then it should displays facts about the concept

  Scenario: Display a concept twice
	Given a container with a concept
	When I add the same concept to it
	Then it should displays facts about the concept once
